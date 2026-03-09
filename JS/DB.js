import { isActiveEvent } from "./utils.js";
import { popupError } from "./event/scout.js";

export async function getUsers() {
  const res = await fetch("https://data.bheitz780.workers.dev/users");
  const users = await res.json();
  return users;
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
  return res;
}

export async function submitQuestionsOnline(answers, scoutID) {
  // miiiight want to make this check for auth tokens sometime. but not now. i don't care
  const evCache = JSON.parse(localStorage.getItem(`eventCache_${localStorage.getItem("currentEventKey")}`));
  const thisEvent = evCache?.eventDetails || (await isActiveEvent().event);

  if (!thisEvent && !navigator.onLine) {
    popupError("You seem to be offline. try uploading with QR.");
  }

  if (answers != "") {
    try {
      const res = await fetch("https://data.bheitz780.workers.dev/db", {
        method: "POST",
        body: JSON.stringify({ data: answers, event: thisEvent.key, scouter: scoutID || JSON.parse(localStorage.getItem("userProfile"))?.id || "Unknown" }),
      });
      console.log(res);
      return res;
    } catch {
      popupError("You seem to be offline. try uploading with QR.");
      return false;
    }
  }
}
