import { getUserTeam } from "/JS/utils.js";

const eventTitle = document.getElementById("eventNameHeader");

const eventKey = localStorage.getItem("currentEventKey") || null;
const eventDetails = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`))?.eventDetails;
const inspectTypeElement = document.getElementById("eventCodeHeader");

const URLParams = new URLSearchParams(window.location.search);
const inspectType = URLParams.get("type") || "thing";
const inspectKey = URLParams.get("key") || "?";

const categoryTemplate = document.getElementById("section-card");

//BIG sorting functions to crunch total scouted data

async function getOrganizedScoutedData() {
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
      const coerced = typeof value === "boolean" ? value : isNaN(Number(value)) || value === "" ? value : Math.round(Number(value) * 100) / 100;
      result[category][questionID] = coerced;
    }
    return result;
  }

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
      const coerced = typeof value === "boolean" ? value : isNaN(Number(value)) || value === "" ? value : Math.round(Number(value) * 100) / 100;
      collected[category][questionID].push(coerced);
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
        result[category][questionID] = Math.round((values.reduce((acc, v) => acc + Number(v), 0) / values.length) * 100) / 100;
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
  // if a string, need to return each teamData question like this: accuracy: {value: 0.55} (as a number)
  // or like this: accuracy: {value: "Terrible", frequency: 0.8} (as a string, where frequency is how often that string occurred).
  // modify getTeamData and it's required functions to do that instead, and modify things that use said functions.
  const teamData = await getTeamData(inspectKey);
  const questionData = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`)).questionsData?.data;
  console.log(teamData);
  for (const categoryID in questionData) {
    console.log(questionData[categoryID]);
  }
  //var qCache = {}
}

if (!eventKey) {
  location.href = "/HTML/index.html?msg=Yeahhh%20idk%20either";
}

document.addEventListener("DOMContentLoaded", () => {
  inspectTypeElement.textContent = inspectKey;
  eventTitle.textContent = `${eventDetails.year} ${eventDetails.district?.abbreviation?.toUpperCase() || eventDetails.short_name} ${eventDetails.short_name} Event`; //.textContent = `${inspectType} ${inspectKey}`;
});
