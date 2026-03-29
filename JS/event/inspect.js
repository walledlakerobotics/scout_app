import { getUsers } from "../DB.js";
import { TBA_GET, newEventCache } from "/JS/utils.js";

const eventTitle = document.getElementById("eventNameHeader");

const users = await getUsers();
const eventKey = localStorage.getItem("currentEventKey") || null;
var eventDetails = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`))?.eventDetails;

function lookupScouter(scoutID) {
  const scouter = Object.values(users).find((u) => String(u.id) === String(scoutID));
  console.log(scouter);
  return scouter || "N/A";
}

// this is the worst spaghetti code ive ever written. made sloppily and in a rush for comp. fix later.

if (eventDetails == null || eventDetails.length == 0) {
  eventDetails = await newEventCache(eventKey);
}

const inspectTypeElement = document.getElementById("eventCodeHeader");

const URLParams = new URLSearchParams(window.location.search);
const inspectType = URLParams.get("type") || "thing";
const inspectKey = URLParams.get("key") || "?";

const isAvgMode = inspectType === "team";

const categoryTemplate = document.getElementById("section-card");

const pillTemplate = categoryTemplate.querySelector("#stat-pill-template");
const barTemplate = categoryTemplate.querySelector("#stat-bar-template");
const txtTemplate = categoryTemplate.querySelector("#stat-txt-template");

const mts = document.querySelector(".match-team-select");
var matchesScouted = {};
//BIG sorting functions to crunch total scouted data

async function getOrganizedScoutedData() {
  const unorganized = JSON.parse(localStorage.getItem(`eventCache_${localStorage.getItem("currentEventKey")}`))?.scoutedData;

  const organizedTeams = {};
  for (const i in unorganized) {
    const g = JSON.parse(unorganized[i].data);
    const submission = JSON.parse(unorganized[i].data)?.questions;
    const data = submission?.data;
    // sort question json into {questionID:{value:questionResponse,category:questionCategory}...}
    // so it can be flattened and compared with other versions
    const sorted = { _scoutID: g.scoutID };
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
  if (!submissions) return {};

  matchesScouted = submissions;

  if (matchID !== null) {
    console.log(submissions);
    const match = submissions.find((s) => s.match?.value == matchID);

    if (!match) return {};
    const scouter = lookupScouter(match._scoutID);
    const result = {};
    for (const questionID in match) {
      if (questionID === "_scoutID") continue;
      const { value, category } = match[questionID];
      if (!result[category]) result[category] = {};
      const coerced = typeof value === "boolean" ? value : isNaN(Number(value)) || value === "" ? value : Math.round(Number(value) * 100) / 100;
      result[category][questionID] = { value: coerced };
    }
    return { data: result, scouter };
  }

  const cachedAvg = JSON.parse(localStorage.getItem(`eventCache_${localStorage.getItem("currentEventKey")}`))?.scoutedDataPTAvg?.[teamKey];
  if (cachedAvg) return { data: cachedAvg, scouter: "N/A" };

  const getVersion = (s) => Object.entries(s).find(([k]) => k !== "_scoutID")?.[1]?.version ?? -1;
  const maxVersion = Math.max(...submissions.map(getVersion));
  const layoutRef = submissions.find((s) => getVersion(s) === maxVersion);
  const validQuestions = new Set(Object.keys(layoutRef ?? {}));
  console.warn(layoutRef, maxVersion);
  const questionsRaw = JSON.parse(localStorage.getItem(`eventCache_${localStorage.getItem("currentEventKey")}`))?.questionsData?.data ?? {};
  const questionTypes = {};
  for (const categoryID in questionsRaw) {
    for (const question of questionsRaw[categoryID]) {
      if (question.id) {
        questionTypes[question.id] = question.type;
      }
    }
  }

  // restricted to the highest ver
  const collected = {};
  for (const submission of submissions) {
    for (const questionID in submission) {
      if (questionID === "_scoutID") continue;
      if (!validQuestions.has(questionID)) continue;
      const { value, category } = submission[questionID];
      if (!collected[category]) collected[category] = {};
      if (!collected[category][questionID]) collected[category][questionID] = [];
      if (value === "_IGNORE") continue;
      const coerced = typeof value === "boolean" ? value : isNaN(Number(value)) || value === "" ? value : Math.round(Number(value) * 100) / 100;
      if (questionTypes[questionID] === "timer" && Math.floor(parseInt(Number(coerced))) == 0) continue;
      collected[category][questionID].push(coerced);
    }
  }

  // average for nums/bools, return most common
  const result = {};
  for (const category in collected) {
    result[category] = {};
    for (const questionID in collected[category]) {
      const values = collected[category][questionID];
      if (values.length === 0) {
        result[category][questionID] = { value: "_IGNORE" };
        continue;
      }
      const isNumeric = values.every((v) => typeof v === "number");
      if (isNumeric) {
        const avg = Math.round((values.reduce((acc, v) => acc + v, 0) / values.length) * 100) / 100;
        result[category][questionID] = { value: avg };
      } else {
        const freq = {};
        for (const v of values) freq[v] = (freq[v] || 0) + 1;
        const maxFreq = Math.max(...Object.values(freq));
        const topValues = Object.keys(freq).filter((k) => freq[k] === maxFreq);
        const isBoolLike = values.every((v) => v === true || v === false);
        const yesRate = isBoolLike ? Math.round((values.filter((v) => v === true).length / values.length) * 100) / 100 : undefined;
        if (topValues.length === 1) {
          result[category][questionID] = { value: topValues[0], frequency: Math.round((maxFreq / values.length) * 100) / 100, totalCount: values.length, yesRate };
        } else {
          result[category][questionID] = { value: isBoolLike ? topValues[0] : "Mixed", frequency: Math.round((maxFreq / values.length) * 100) / 100, totalCount: values.length, yesRate };
        }
      }
    }
  }
  console.warn(result);
  return { data: result, scouter: "N/A" };
}

function newStat(type = "pill", parent, label, qData) {
  const value = qData?.value;
  var frequency = qData?.frequency;
  let clone;
  let text = value;

  if (frequency) {
    text = `${value} · ${Math.round(frequency * 100)}%`;
  }
  if (type === "bar") {
    clone = barTemplate.cloneNode(true);
    clone.querySelector(".stat-label").textContent = label;
    clone.querySelector(".stat-bar-label-row span").textContent = text;

    const barFill = clone.querySelector(".stat-bar-fill");
    const textElem = clone.querySelector(".minmax");
    let width;
    if (qData.qType === "slider") {
      const min = qData.qMin ?? 0;
      const max = qData.qMax ?? 100;
      width = ((qData.value - min) / (max - min)) * 100;
      textElem.textContent = `${qData.value} / ${max}`;
    } else {
      const freq = qData.frequency ?? 0;
      width = freq * 100;
      if (qData.totalCount) {
        const count = Math.round(freq * qData.totalCount);
        textElem.textContent = `${count} / ${qData.totalCount}`;
      } else {
        textElem.textContent = `${Math.round(width)} / 100`;
      }
    }
    barFill.style.width = `${width}%`;
  } else if (type == "pill") {
    clone = pillTemplate.cloneNode(true);
    clone.querySelector(".stat-label").textContent = label;
    clone.querySelector(".stat-pill").textContent = text;
  } else {
    console.warn(qData);
    clone = txtTemplate.cloneNode(true);
    clone.querySelector(".stat-label").textContent = label;
    clone.querySelector(".stat-txt").textContent = text;
  }
  clone.removeAttribute("id");
  clone.classList.remove("template");
  parent.appendChild(clone);
  return clone;
}

async function loadHero(key, teamData, scouter = "N/A") {
  document.getElementById("team-number").textContent = key;
  const logoEl = document.getElementById("team-logo");
  logoEl.classList.remove("no-logo");
  logoEl.onerror = function () {
    this.onerror = null;
    this.classList.add("no-logo");
    this.src = "../Img/Noicon_mono.png";
  };
  logoEl.src = `https://www.thebluealliance.com/avatar/2026/frc${key}.png`;

  const start = teamData?.prematch?.startpos?.value;
  if (start) {
    document.getElementById("hero-startpos").textContent = start;
  }

  // wr from cache. should get from preorganized data, except it doesnt cause yeah
  const mData = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`))?.mData ?? [];
  const teamKeyFull = `frc${key}`;
  const played = mData.filter((m) => (m.alliances.blue.team_keys.includes(teamKeyFull) || m.alliances.red.team_keys.includes(teamKeyFull)) && m.alliances.red.score >= 0 && m.alliances.blue.score >= 0);
  if (played.length > 0) {
    const wins = played.filter((m) => {
      const side = m.alliances.blue.team_keys.includes(teamKeyFull) ? "blue" : "red";
      return m.winning_alliance === side;
    }).length;
    document.getElementById("hero-winrate").textContent = `${Math.round((wins / played.length) * 100)}%`;

    document.getElementById("hero-scouter").textContent = scouter;
  }

  const [teamInfo, rankings] = await Promise.all([TBA_GET(`/team/frc${key}`), TBA_GET(`/event/${eventKey}/rankings`)]);
  if (teamInfo?.nickname) document.getElementById("team-name").textContent = teamInfo.nickname;
  if (rankings?.rankings) {
    const entry = rankings.rankings.find((r) => r.team_key === teamKeyFull);
    if (entry) {
      const r = entry.rank;
      const suffix = r === 1 ? "st" : r === 2 ? "nd" : r === 3 ? "rd" : "th";
      document.getElementById("hero-rank").textContent = `${r}${suffix}`;
    }
  }
}

function renderStats(teamData) {
  const questionsRaw = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`)).questionsData?.data;

  const questionLookup = {};
  for (const categoryID in questionsRaw) {
    for (const question of questionsRaw[categoryID]) {
      if (question.id) questionLookup[question.id] = { ...question.leaderboard, _qType: question.type, _min: question.min, _max: question.max };
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

      const statType = isAvgMode ? lb.type : lb._qType === "textarea" ? "txt" : "pill";
      const label = isAvgMode ? lb["title-avg"] : lb["title-single"];

      const qData = teamData[categoryID][questionID];
      let displayValue = qData.value;
      if (displayValue === "_IGNORE") displayValue = "[N/A]";
      else if (displayValue === true || displayValue === "true") displayValue = "Yes";
      else if (displayValue === false || displayValue === "false") displayValue = "No";

      if (displayValue === null || displayValue === undefined || displayValue === "") continue;

      if (!displayCategories[targetCategory]) displayCategories[targetCategory] = [];
      displayCategories[targetCategory].push({ label, statType, value: displayValue, frequency: qData.frequency, totalCount: qData.totalCount, qType: lb._qType, qMin: lb._min, qMax: lb._max });
    }
  }

  console.log(displayCategories);
  for (const categoryID in displayCategories) {
    const categoryElement = categoryTemplate.cloneNode(true);
    const statContainer = categoryElement.querySelector(".section-stats");
    const header = categoryElement.querySelector(".section-header");
    categoryElement.classList.remove("template");

    statContainer.innerHTML = "";

    for (const stat of displayCategories[categoryID]) {
      if (stat.label && stat.value) {
        newStat(stat.statType, statContainer, stat.label, { value: stat.value, frequency: stat.frequency, totalCount: stat.totalCount, qType: stat.qType, qMin: stat.qMin, qMax: stat.qMax });
      }
    }

    if (!statContainer.hasChildNodes()) continue;

    header.textContent = categoryID.toUpperCase();
    categoryTemplate.parentNode.appendChild(categoryElement);
  }
}

function clearStats() {
  document
    .querySelector(".team-sections")
    .querySelectorAll(".section-card:not(.template)")
    .forEach((el) => el.remove());
}

const mData = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`))?.mData ?? [];

function renderMatchButtons(teamNum, submissions) {
  const container = document.getElementById("others-container");
  const teamAvgBtn = container.querySelector(".btn-template");

  container.querySelectorAll("button:not(.btn-template)").forEach((el) => el.remove());

  if (isAvgMode) {
    teamAvgBtn.style.display = "none";
  } else {
    teamAvgBtn.style.display = "";
    teamAvgBtn.classList.add("ta");
    teamAvgBtn.onclick = () => {
      location.href = `inspect.html?type=team&key=${teamNum}`;
    };
  }

  if (!submissions?.length) return;

  const teamKeyFull = `frc${teamNum}`;
  submissions.reverse();
  for (const submission of submissions) {
    const matchNum = submission.match?.value;
    if (!matchNum) continue;

    const matchEntry = mData.find((m) => m.match_number == matchNum && m.comp_level === "qm") ?? mData.find((m) => m.match_number == matchNum);
    const matchKey = matchEntry?.key ?? `${eventKey}_qm${matchNum}`;
    const matchWinner = matchEntry?.winning_alliance;
    const teamAlliance = matchEntry?.alliances.blue.team_keys.includes(teamKeyFull) ? "blue" : "red";

    const btn = document.createElement("button");
    btn.textContent = `Match #${matchNum}`;
    btn.className = "main-button striped-bg-img";
    if (matchWinner && matchWinner !== "") {
      btn.classList.add(matchWinner === teamAlliance ? "won" : "lost");
    }
    btn.addEventListener("click", () => {
      location.href = `inspect.html?type=match&key=${matchKey}&team=${teamNum}`;
    });
    container.appendChild(btn);
  }
}

if (inspectType == "team") {
  const { data: teamData, scouter } = await getTeamData(inspectKey);
  console.log(teamData);
  loadHero(inspectKey, teamData, scouter?.name);
  if (teamData) renderStats(teamData);
  mts.style.display = "none";
  renderMatchButtons(inspectKey, matchesScouted);
} else {
  mts.style.display = "flex";
  const match = mData.find((m) => m.key == inspectKey);
  const matchNumber = match?.match_number?.toString();

  const teams = [...match.alliances.blue.team_keys.map((k, i) => ({ teamNum: k.slice(3), label: `Blue ${i + 1}` })), ...match.alliances.red.team_keys.map((k, i) => ({ teamNum: k.slice(3), label: `Red ${i + 1}` }))];

  let currentIndex = 0;

  async function loadTeam(index) {
    const { teamNum, label } = teams[index];
    document.getElementById("team-label").textContent = label;
    document.getElementById("hero-rank").textContent = "—";
    document.getElementById("hero-winrate").textContent = "—";
    document.getElementById("hero-startpos").textContent = "—";
    document.getElementById("team-name").textContent = "Team";
    clearStats();
    renderMatchButtons(teamNum, null); // clear while loading

    const { data: teamData, scouter } = await getTeamData(teamNum, matchNumber);
    loadHero(teamNum, teamData, scouter?.name);
    if (teamData) renderStats(teamData);
    renderMatchButtons(teamNum, matchesScouted);
  }

  document.getElementById("swap-left").addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + teams.length) % teams.length;
    loadTeam(currentIndex);
  });

  document.getElementById("swap-right").addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % teams.length;
    loadTeam(currentIndex);
  });

  const teamParam = URLParams.get("team");
  const startIndex = teamParam ? Math.max(0, teams.findIndex((t) => t.teamNum === teamParam)) : 0;
  await loadTeam(startIndex);
}

if (!eventKey) {
  location.href = "/HTML/index.html?msg=Yeahhh%20idk%20either";
}

window.back = function () {
  location.href = `/HTML/event-frc.html?eventKey=${eventKey}`;
};

inspectTypeElement.textContent = inspectKey;
eventTitle.textContent = `${eventDetails.year} ${eventDetails.district?.abbreviation?.toUpperCase() || eventDetails.short_name} ${eventDetails.short_name} Event`;
