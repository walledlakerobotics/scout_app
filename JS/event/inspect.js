import { getUserTeam } from "/JS/utils.js";

const eventTitle = document.getElementById("eventNameHeader");

const eventKey = localStorage.getItem("currentEventKey") || null;
const eventDetails = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`))?.eventDetails;
const inspectTypeElement = document.getElementById("eventCodeHeader");

const URLParams = new URLSearchParams(window.location.search);
const inspectType = URLParams.get("type") || "thing";
const inspectKey = URLParams.get("key") || "?";

async function getOrganizedScoutedData() {
  //BIG sorting function to crush total scouted data into
  const unorganized = JSON.parse(localStorage.getItem(`eventCache_${localStorage.getItem("currentEventKey")}`))?.scoutedData;
  const organizedTeams = {};
  for (const i in unorganized) {
    const submission = JSON.parse(unorganized[i].data)?.questions;
    const data = submission?.data;
    // sort question json into {questionID:{value:questionResponse,category:questionCategory}...}
    // so it can be flattened and compared with other versions
    const sorted = {};
    for (const category in data) {
      for (const questionID in data[category]) {
        sorted[questionID] = { value: data[category][questionID], category, version: submission.version || -1 };
      }
    }
    const team = sorted.team?.value;
    if (team) {
      if (!organizedTeams[team]) organizedTeams[team] = [];
      organizedTeams[team].push(sorted);
    }
  }
  return organizedTeams;
}

// returns averaged team data by category, or a single match's data if matchID is provided
async function getTeamData(teamKey, matchID = null) {
  const organizedTeams = await getOrganizedScoutedData();
  const submissions = organizedTeams[teamKey];
  if (!submissions) return null;

  if (matchID !== null) {
    const match = submissions.find((s) => s.match?.value == matchID);
    if (!match) return null;
    const result = {};
    for (const questionID in match) {
      const { value, category } = match[questionID];
      if (!result[category]) result[category] = {};
      result[category][questionID] = value;
    }
    return result;
  }

  // Use the question layout from the highest-version submission as the canonical set
  const maxVersion = Math.max(...submissions.map((s) => Object.values(s)[0]?.version ?? -1));
  const layoutRef = submissions.find((s) => Object.values(s)[0]?.version === maxVersion);
  const validQuestions = new Set(Object.keys(layoutRef ?? {}));

  // restricted to the highest ver
  const collected = {};
  for (const submission of submissions) {
    for (const questionID in submission) {
      if (!validQuestions.has(questionID)) continue;
      const { value, category } = submission[questionID];
      if (!collected[category]) collected[category] = {};
      if (!collected[category][questionID]) collected[category][questionID] = [];
      collected[category][questionID].push(value);
    }
  }

  // average for nums/bools, return most common or "Mixed"
  const result = {};
  for (const category in collected) {
    result[category] = {};
    for (const questionID in collected[category]) {
      const values = collected[category][questionID];
      const isNumericOrBool = values.every((v) => typeof v === "number" || typeof v === "boolean");
      if (isNumericOrBool) {
        result[category][questionID] = values.reduce((acc, v) => acc + Number(v), 0) / values.length;
      } else {
        const freq = {};
        for (const v of values) freq[v] = (freq[v] || 0) + 1;
        const maxFreq = Math.max(...Object.values(freq));
        const topValues = Object.keys(freq).filter((k) => freq[k] === maxFreq);
        result[category][questionID] = topValues.length === 1 ? topValues[0] : "Mixed";
      }
    }
  }
  return result;
}

if (inspectType == "team") {
  const teamData = await getTeamData(inspectKey);
  console.log(teamData);
}

if (!eventKey) {
  location.href = "/HTML/index.html?msg=Yeahhh%20idk%20either";
}

document.addEventListener("DOMContentLoaded", () => {
  inspectTypeElement.textContent = inspectKey;
  eventTitle.textContent = `${eventDetails.year} ${eventDetails.district?.abbreviation?.toUpperCase() || eventDetails.short_name} ${eventDetails.short_name} Event`; //.textContent = `${inspectType} ${inspectKey}`;
});
