import { isActiveEvent } from "./utils.js";
import { popupError } from "./event/scout.js";

/* this is the worker code on cloudflare. remove before uploading and when done:

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(req, env) {

    async function getQuestions(ver) {
      const query = ver
        ? "SELECT version, data FROM questions WHERE version = ?"
        : "SELECT version, data FROM questions ORDER BY version DESC LIMIT 1";

      const row = await env.DB
        .prepare(query)
        .bind(...(ver ? [ver] : []))
        .first();

      if (!row) {
        return new Response(
          JSON.stringify({ error: "No questions found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = typeof row.data === "string" ? { "data": JSON.parse(row.data), "version": row.version } : row.data;

      return data;
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);

    if (url.pathname === "/users") {
      if (req.method === "GET") {
        const { results } = await env.DB
          .prepare("SELECT * FROM users")
          .all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "POST") {
        // body.id present -> update just the given fields on that user. absent -> create a new one.
        // done as two plain statements (not an upsert) because SQLite validates NOT NULL constraints
        // against the raw INSERT values before it even checks for a conflict, so a null in an
        // untouched field could kill the whole statement even though DO UPDATE would've been fine.
        const body = await req.json();

        if (body.id) {
          await env.DB
            .prepare(`UPDATE users SET
                name = COALESCE(?, name),
                role = COALESCE(?, role),
                team = COALESCE(?, team),
                scouting = COALESCE(?, scouting)
              WHERE id = ?`)
            .bind(body.name ?? null, body.role ?? null, body.team ?? null, body.scouting ?? null, body.id)
            .run();
          return new Response(JSON.stringify({ success: true, id: body.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // ids are just an increasing integer (stored as text), not a uuid
        const maxRow = await env.DB
          .prepare("SELECT MAX(CAST(id AS INTEGER)) as max_id FROM users")
          .first();
        const id = String((maxRow?.max_id ?? 0) + 1);

        await env.DB
          .prepare("INSERT INTO users (id, name, role, team, scouting) VALUES (?, ?, ?, ?, ?)")
          .bind(id, body.name ?? null, body.role ?? null, body.team ?? null, body.scouting ?? null)
          .run();
        return new Response(JSON.stringify({ success: true, id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "DELETE") {
        const id = url.searchParams.get("id");
        await env.DB
          .prepare("DELETE FROM users WHERE id = ?")
          .bind(id)
          .run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    } else if (url.pathname === "/db") {
      if (req.method === "POST") {
        try {
          const body = await req.json();
          const { data, event } = body;

          if (!event || !data) {
            return new Response(
              JSON.stringify({ error: "Missing event or data" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const tableName = event.replace(/[^a-zA-Z0-9_]/g, '_');

          try {
            await env.DB
              .prepare(`CREATE TABLE IF NOT EXISTS "event_${tableName}" (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at INTEGER NOT NULL
              )`)
              .run();
          } catch (err) {
            console.error("Error creating table:", err);
            return new Response(
              JSON.stringify({ error: err }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const id = crypto.randomUUID();
          const timestamp = Date.now();
          await env.DB
            .prepare(`INSERT INTO "event_${tableName}" (id, data, created_at) VALUES (?, ?, ?)`)
            .bind(id, JSON.stringify(data), timestamp)
            .run();

          return new Response(
            JSON.stringify({ success: true, id, event: `event_${tableName}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (err) {
          console.error("Error processing request:", err);
          return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (req.method === "GET") {
        const event = url.searchParams.get("eventKey")
        if (event) {
          const tableName = event.replace(/[^a-zA-Z0-9_]/g, '_');
          try {
            const { results } = await env.DB
              .prepare(`SELECT * FROM "event_${tableName}" ORDER BY created_at DESC`)
              .all();
            const questions = await getQuestions()
            return new Response(JSON.stringify({ data: results, questions:questions }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } catch (err) {
            return new Response(
              JSON.stringify({ error: "Table not found or query failed" }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

    } else if (url.pathname === "/questions") {
      if (req.method === "GET") {
        try {
          const specificVersion = url.searchParams.get("version")
            ? Number(url.searchParams.get("version"))
            : undefined;
          const data = await getQuestions(specificVersion)
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Error fetching questions:", err);
          return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (req.method === "POST") {
        try {
          const body = await req.json();

          const versionRow = await env.DB
            .prepare("SELECT MAX(version) as max_version FROM questions")
            .first();

          const nextVersion = (versionRow?.max_version ?? 0) + 1;

          await env.DB
            .prepare("INSERT INTO questions (version, data) VALUES (?, ?)")
            .bind(nextVersion, JSON.stringify(body))
            .run();

          return new Response(
            JSON.stringify({ success: true, version: nextVersion }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (err) {
          console.error("Error saving questions:", err);
          return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};

*/

export async function getUsers() {
  const res = await fetch("https://data.bheitz780.workers.dev/users");
  const users = await res.json();
  return users;
}

// updates only the given fields on an existing user (id required)
export async function updateUser(id, updates) {
  const res = await fetch("https://data.bheitz780.workers.dev/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) throw new Error(`Failed to update user (${res.status})`);
  return res.json();
}

// creates a new user (no id -> server generates one). returns { success, id }
export async function addUser(data) {
  const res = await fetch("https://data.bheitz780.workers.dev/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to add user (${res.status})`);
  return res.json();
}

export async function deleteUser(id) {
  const res = await fetch(`https://data.bheitz780.workers.dev/users?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete user (${res.status})`);
}

export async function questionDB(method, data, fetchOptions = {}) {
  if (method === "GET") {
    const res = await fetch("https://data.bheitz780.workers.dev/questions", fetchOptions);
    const questionData = await res.json();
    return questionData;
  } else if (method === "POST") {
    const res = await fetch("https://data.bheitz780.workers.dev/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result;
  }
}
export async function getDB(param) {
  const res = await fetch(`https://data.bheitz780.workers.dev${param}`, {
    method: "GET",
  });
  return res.json();
}

export async function submitQuestionsOnline(answers, scoutID, eventKey) {
  // miiiight want to make this check for auth tokens sometime. but not now. i don't care
  const resolvedKey = eventKey || localStorage.getItem("currentEventKey");
  const evCache = JSON.parse(localStorage.getItem(`eventCache_${resolvedKey}`));
  const thisEvent = evCache?.eventDetails || (await isActiveEvent()).event;

  if (!thisEvent && !navigator.onLine) {
    popupError("You seem to be offline. try uploading with QR.");
  }

  if (answers != "") {
    try {
      const res = await fetch("https://data.bheitz780.workers.dev/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: answers, event: thisEvent.key, scouter: scoutID || JSON.parse(localStorage.getItem("userProfile"))?.id || "Unknown" }),
      });
      const result = await res.json();
      console.log(result);
      if (!res.ok || !result.id || result.id.length < 10) return false;
      return result;
    } catch {
      popupError("You seem to be offline. try uploading with QR.");
      return false;
    }
  }
}
