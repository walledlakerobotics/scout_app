import { getUserTeam } from "/JS/utils.js";

const eventTitle = document.getElementById("eventNameHeader");

const eventKey = localStorage.getItem("currentEventKey") || null;
const eventDetails = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`))?.eventDetails;
const inspectTypeElement = document.getElementById("eventCodeHeader");

const URLParams = new URLSearchParams(window.location.search);
const inspectType = URLParams.get("type") || "thing";
const inspectKey = URLParams.get("key") || "?";
const matchKey = URLParams.get("match") || null;
const isAvgMode = matchKey === null;

const categoryTemplate = document.getElementById("section-card");

const pillTemplate = categoryTemplate.querySelector("#stat-pill-template");
const barTemplate = categoryTemplate.querySelector("#stat-bar-template");

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
      result[category][questionID] = { value: coerced };
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
      const isNumeric = values.every((v) => typeof v === "number");
      if (isNumeric) {
        const avg = Math.round((values.reduce((acc, v) => acc + v, 0) / values.length) * 100) / 100;
        result[category][questionID] = { value: avg };
      } else {
        const freq = {};
        for (const v of values) freq[v] = (freq[v] || 0) + 1;
        const maxFreq = Math.max(...Object.values(freq));
        const topValues = Object.keys(freq).filter((k) => freq[k] === maxFreq);
        if (topValues.length === 1) {
          result[category][questionID] = { value: topValues[0], frequency: Math.round((maxFreq / values.length) * 100) / 100 };
        } else {
          result[category][questionID] = { value: "Mixed" };
        }
      }
    }
  }
  return result;
}

function newStat(type = "pill", parent, label, qData) {
  const value = qData?.value;
  const frequency = qData?.frequency;
  let clone;
  let text = `${value}`;
  if (frequency) {
    text = `${value} · ${frequency * 100}%`;
  }

  if (type === "bar") {
    clone = barTemplate.cloneNode(true);
    clone.querySelector(".stat-label").textContent = label;
    clone.querySelector(".stat-bar-label-row span").textContent = text;
  } else {
    clone = pillTemplate.cloneNode(true);
    clone.querySelector(".stat-label").textContent = label;
    clone.querySelector(".stat-pill").textContent = text;
  }
  clone.removeAttribute("id");
  clone.classList.remove("template");
  parent.appendChild(clone);
  return clone;
}

if (inspectType == "team") {
  const teamData = await getTeamData(inspectKey, matchKey);
  const questionsRaw = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`)).questionsData?.data;
  console.log(teamData);

  const questionLookup = {};
  for (const categoryID in questionsRaw) {
    for (const question of questionsRaw[categoryID]) {
      if (question.id) questionLookup[question.id] = question.leaderboard;
    }
  }

  const displayCategories = {};

  for (const categoryID in teamData) {
    for (const questionID in teamData[categoryID]) {
      const lb = questionLookup[questionID];
      if (!lb) continue;

      if (lb.visibility === "avg" && !isAvgMode) continue;
      if (lb.visibility === "single" && isAvgMode) continue;

      const targetCategory = lb["category-override"] || categoryID;

      const statType = isAvgMode ? lb.type : "pill";
      const label = isAvgMode ? lb["title-avg"] : lb["title-single"];

      // yes/no
      const qData = teamData[categoryID][questionID];
      let displayValue = qData.value;
      if (displayValue === true || displayValue === "true") displayValue = "Yes";
      else if (displayValue === false || displayValue === "false") displayValue = "No";

      if (displayValue === null || displayValue === undefined || displayValue === "") continue;

      if (!displayCategories[targetCategory]) displayCategories[targetCategory] = [];
      displayCategories[targetCategory].push({ label, statType, value: displayValue, frequency: qData.frequency });
    }
  }

  // render
  for (const categoryID in displayCategories) {
    const categoryElement = categoryTemplate.cloneNode(true);
    const statContainer = categoryElement.querySelector(".section-stats");
    const header = categoryElement.querySelector(".section-header");

    statContainer.innerHTML = "";

    for (const stat of displayCategories[categoryID]) {
      newStat(stat.statType, statContainer, stat.label, { value: stat.value, frequency: stat.frequency });
    }

    header.textContent = categoryID.toUpperCase();
    categoryTemplate.parentNode.appendChild(categoryElement);
  }
  categoryTemplate.remove();
}

if (!eventKey) {
  location.href = "/HTML/index.html?msg=Yeahhh%20idk%20either";
}

document.addEventListener("DOMContentLoaded", () => {
  inspectTypeElement.textContent = inspectKey;
  eventTitle.textContent = `${eventDetails.year} ${eventDetails.district?.abbreviation?.toUpperCase() || eventDetails.short_name} ${eventDetails.short_name} Event`; //.textContent = `${inspectType} ${inspectKey}`;
});
