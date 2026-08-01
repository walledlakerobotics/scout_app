// ONCE PUBLISHED TO WEBSITE ALL CLOUDFLARE WORKERS MUST BE MOVED TO AN OFFICIAL ACCOUNT

import { questionDB } from "/JS/DB.js";
import { getDB } from "/JS/DB.js";

export async function TBA_GET(endpoint) {
  // fetch the blue alliance with cloudflare auth worker
  // note if TBA adds any sort of rate limiting this will probably need to be changed
  try {
    const response = await fetch(`https://tba-auth.bheitz780.workers.dev${endpoint}`);
    const data = await response.json();
    return data;
  } catch (err) {
    // network error? i think
    return false;
  }
}

export function isAdmin() {
  return localStorage.getItem("isAdmin") === "true";
}

export function getUserTeam() {
  const token = localStorage.getItem("scoutingAuthToken");
  //if (!token) return false;

  const dToken = atob(token);
  let team = "308";

  if (dToken.includes("7178")) {
    team = "7178";
  }

  return team;
}

export async function isActiveEvent(overrideStr) {
  // returns { isActive: boolean, event: currentevent/nextevent/null}

  if (overrideStr) {
    const event = await TBA_GET(`/event/${overrideStr}`);
    if (!event) return false;
    newEventCache(event.key);
    return { isActive: true, event };
  }

  let currentEvent = null;
  let nextEvent = null;
  const devOverride = true;

  try {
    const team = getUserTeam();
    const now = new Date();

    const events = await TBA_GET(`/team/frc${team}/events/${now.getUTCFullYear()}`);

    if (!events) return false;

    for (const details of events) {
      const start = new Date(details.start_date + "T00:00:00");
      const end = new Date(details.end_date + "T23:59:59");

      // active event in range
      if (now >= start && now <= end) {
        currentEvent = details;
        break;
      }

      // soonest upcoming event
      if (start > now) {
        if (nextEvent === null || start < new Date(nextEvent.start_date)) {
          nextEvent = details;
        }
      }
    }
  } catch (error) {
    alert("Error fetching events:", error);
    console.error("Error fetching events:", error);
    return false;
  }

  if (currentEvent) {
    newEventCache(currentEvent.key);
    return {
      isActive: true,
      event: currentEvent,
    };
  }

  if (nextEvent) {
    return {
      isActive: devOverride,
      event: nextEvent,
    };
  }

  // end of the season???
  return {
    isActive: false,
    event: null,
  };
}

export function retagResponses(untaggedResponses, questions, offlineEnabled = true, disabledIds = new Set()) {
  if (!questions) {
    return null;
  }

  const retaggedResponses = {};

  for (const categoryId in untaggedResponses) {
    if (!questions[categoryId]) continue;

    retaggedResponses[categoryId] = {};

    const categoryQuestions = questions[categoryId];

    untaggedResponses[categoryId].forEach((value, index) => {
      const q = categoryQuestions[index];
      if (q && q.id) {
        if (!offlineEnabled && q.offline === true) return;
        retaggedResponses[categoryId][q.id] = disabledIds.has(q.id) ? "_IGNORE" : value;
      }
    });
  }

  return retaggedResponses;
}

export async function populateQuestions(questions, categoryID, categoryFormElement, responses = {}, dependentElements = [], onResponseChange = () => {}) {
  const id = categoryID;
  const categoryData = questions[categoryID];
  let questionLookup = {};
  function newTemplateFromID(id) {
    const templates = Array.from(document.querySelectorAll(".form-template"));
    const foundEl = templates.find((template) => template.id === id) || null;
    if (foundEl) {
      const newEl = foundEl.cloneNode(true);
      return newEl;
    }
    return;
  }
  categoryData?.forEach((questionInfo, index) => {
    const qType = questionInfo.type;
    const element = newTemplateFromID(qType);

    element.dataset.questionIndex = index; // array position
    element.dataset.questionId = questionInfo.id;

    const qHeader = element.querySelector("#question-header");
    qHeader.textContent = questionInfo.header;
    (responses[id] ??= [])[index] = questionInfo.state;

    if (questionInfo.offline == true) {
      element.classList.add("offlineQuestion");
    }

    const infoBtn = element.querySelector(".infobtn");
    if (questionInfo.info) {
      infoBtn.addEventListener("click", (e) => {
        showPopup(true, questionInfo.info.header, questionInfo.info.body);
      });
    } else {
      infoBtn.style.display = "none";
    }

    if (qType == "toggle") {
      //toggle
      const qText = element.querySelector("#question-text");
      if (!questionInfo.text || questionInfo.text === "") {
        qText.remove();
      } else {
        qText.textContent = questionInfo.text;
      }
      const checkbox = element.querySelector("input[type=checkbox]");
      checkbox.id = `${id}-${index}-toggle`;
      if (questionInfo.state) {
        checkbox.checked = true;
      }

      checkbox.addEventListener("change", (e) => {
        onResponseChange(e.target.id, e.target.checked);
      });
    } else if (qType == "dropdown") {
      //dropdown
      const placeholder = element.querySelector("#option-placeholder");
      const select = element.querySelector("select");
      select.id = `${id}-${index}-select`;

      for (const optionIndex in questionInfo["dropdown-options"]) {
        const option = placeholder.cloneNode(true);
        option.textContent = questionInfo["dropdown-options"][optionIndex];
        placeholder.parentNode.appendChild(option);
      }
      placeholder.textContent = questionInfo.state;

      select.addEventListener("change", (e) => {
        onResponseChange(e.target.id, e.target.value);
      });
      select.value = questionInfo.state;
    } else if (qType == "text" || qType == "textarea") {
      //text inputs
      const input = element.querySelector("#text");
      input.id = `${id}-${index}-text`;
      input.placeholder = questionInfo.placeholder;
      input.value = questionInfo.state;

      input.addEventListener("input", (e) => {
        onResponseChange(e.target.id, e.target.value);
      });
    } else if (qType == "counter") {
      //counter
      const count = element.querySelector("#count");
      count.id = `${id}-${index}-count`;
      count.value = questionInfo.state;
      count.textContent = questionInfo.state;

      const decrementBtn = element.querySelector('button[onclick*="decrementCounter"]');
      const incrementBtn = element.querySelector('button[onclick*="incrementCounter"]');

      if (decrementBtn) {
        decrementBtn.setAttribute("onclick", `decrementCounter('${count.id}')`);
      }
      if (incrementBtn) {
        incrementBtn.setAttribute("onclick", `incrementCounter('${count.id}')`);
      }
    } else if (qType == "slider") {
      //slider
      const slider = element.querySelector("#range");
      const value = element.querySelector("#slider-value");
      const min = element.querySelector("#min-label");
      const max = element.querySelector("#max-label");

      slider.id = `${id}-${index}-slider`;
      value.id = `${id}-${index}-slider-value`;

      slider.min = questionInfo.min;
      slider.max = questionInfo.max;
      slider.step = questionInfo.step;
      slider.value = questionInfo.state;
      value.textContent = questionInfo.state;
      min.textContent = questionInfo["label-min"];
      max.textContent = questionInfo["label-max"];

      slider.addEventListener("input", (e) => {
        value.textContent = e.target.value;
        onResponseChange(e.target.id, Number(e.target.value));
      });
    } else if (qType == "timer") {
      //timer
      const timeInput = element.querySelector("#time");
      timeInput.id = `${id}-${index}-time`;
      timeInput.value = questionInfo.state;

      const playPauseBtn = element.querySelector("#play-pause-btn");
      const restartBtn = element.querySelector("#restart-btn");
      const playPauseIcon = playPauseBtn.querySelector("ion-icon");

      playPauseBtn.id = `${id}-${index}-play-pause`;
      restartBtn.id = `${id}-${index}-restart`;

      let isRunning = false;
      let startTime = 0;
      let elapsedTime = 0;
      let intervalId = null;

      playPauseBtn.addEventListener("click", () => {
        if (isRunning) {
          // pause
          clearInterval(intervalId);
          isRunning = false;
          onResponseChange(timeInput.id, (elapsedTime / 1000).toFixed(2));
          playPauseIcon.setAttribute("name", "play");
        } else {
          // play
          startTime = Date.now() - elapsedTime;
          intervalId = setInterval(() => {
            elapsedTime = Date.now() - startTime;
            const seconds = (elapsedTime / 1000).toFixed(2);
            timeInput.value = seconds;
            onResponseChange(timeInput.id, seconds, true);
          }, 10); //ms
          isRunning = true;
          playPauseIcon.setAttribute("name", "pause");
        }
      });

      restartBtn.addEventListener("click", () => {
        clearInterval(intervalId);
        isRunning = false;
        elapsedTime = 0;
        timeInput.value = "0.00";
        playPauseIcon.setAttribute("name", "play");
        onResponseChange(timeInput.id, "0.00");
      });

      timeInput.addEventListener("input", (e) => {
        // this'll prob lag like hell so might have to change later
        if (isRunning) {
          clearInterval(intervalId);
          isRunning = false;
          playPauseIcon.setAttribute("name", "play");
        }
        // oh lord idk here
        const manualValue = parseFloat(e.target.value) || 0;
        elapsedTime = manualValue * 1000;
        onResponseChange(e.target.id, e.target.value, true);
      });
    } else {
      console.warn("missing case or element for type:", qType);
    }

    if (questionInfo.id) {
      questionLookup[questionInfo.id] = {
        defaultState: questions[id][index].state,
        hideDependencies: questions[id][index]["hide-dependencies"] ?? null,
        categoryId: id,
        questionIndex: index,
      };
    }
    if (questionInfo.depends || questionInfo.offline) {
      dependentElements.push({
        element,
        depends: questionInfo.depends || [],
        isOffline: questionInfo.offline === true,
      });
    }

    categoryFormElement.appendChild(element);
    element.classList.remove("form-template");
  });
  return { responses, questionLookup };
}

export async function newEventCache(eventKey, questionsFetcher) {
  let [mData, eventDetails, questionsData, scoutedData] = await Promise.all([TBA_GET(`/event/${eventKey}/matches`), TBA_GET(`/event/${eventKey}`), questionsFetcher ? questionsFetcher() : questionDB("GET"), getDB(`/db?eventKey=${eventKey}`)]);

  if (mData && mData.length !== 0) {
    mData.sort((a, b) => {
      const matchTypeOrder = { qm: 1, ef: 2, qf: 3, sf: 4, f: 5 };
      if (matchTypeOrder[a.comp_level] !== matchTypeOrder[b.comp_level]) {
        return matchTypeOrder[a.comp_level] - matchTypeOrder[b.comp_level];
      }
      const aNum = a.comp_level === "sf" ? a.set_number : a.match_number;
      const bNum = b.comp_level === "sf" ? b.set_number : b.match_number;
      if (aNum === bNum) return a.match_number - b.match_number;
      return aNum - bNum;
    });
  }

  const lastUpdated = new Date().getTime();
  //sorted, per-team averages. HELL! HELL! HELL!
  const scoutedDataPTAvgs = scoutedData?.data ? getAllTeamAverages(scoutedData.data, questionsData) : {};
  const scoutedDataPTAvgsFlat = {};
  for (const team in scoutedDataPTAvgs) {
    scoutedDataPTAvgsFlat[team] = {};
    for (const category in scoutedDataPTAvgs[team]) {
      for (const questionID in scoutedDataPTAvgs[team][category]) {
        scoutedDataPTAvgsFlat[team][questionID] = scoutedDataPTAvgs[team][category][questionID];
      }
    }
  }
  const cache = { mData, eventDetails, lastUpdated, questionsData, scoutedData: scoutedData.data, scoutedDataPTAvgs, scoutedDataPTAvgsFlat };
  localStorage.setItem(`eventCache_${eventKey}`, JSON.stringify(cache));
  localStorage.setItem("currentEventKey", eventKey);
  return cache;
}

export function getAllTeamAverages(scoutedData, questionsData) {
  // raw submissions, by team
  const organizedTeams = {};
  for (const i in scoutedData) {
    const guh = JSON.parse(scoutedData[i].data);
    const submission = JSON.parse(scoutedData[i].data)?.questions;
    const data = submission?.data;
    const sorted = { _scoutID: guh.scoutID };
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

  const questionsRaw = questionsData?.data ?? {};
  const questionTypes = {};
  for (const categoryID in questionsRaw) {
    for (const question of questionsRaw[categoryID]) {
      if (question.id) questionTypes[question.id] = question.type;
    }
  }

  // note for future developers: "sorry"

  const allTeamAverages = {};
  for (const teamKey in organizedTeams) {
    const submissions = organizedTeams[teamKey];
    const getVersion = (s) => Object.entries(s).find(([k]) => k !== "_scoutID")?.[1]?.version ?? -1;
    const maxVersion = Math.max(...submissions.map(getVersion));
    const layoutRef = submissions.find((s) => getVersion(s) === maxVersion);
    const validQuestions = new Set(Object.keys(layoutRef ?? {}));

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
    const result = {};
    for (const category in collected) {
      result[category] = {};
      for (const questionID in collected[category]) {
        const values = collected[category][questionID];
        if (values.length === 0) {
          result[category][questionID] = { value: "_IGNORE" };
          continue;
        }
        const numericCount = values.filter((v) => typeof v === "number").length;
        const isNumberLike = numericCount > values.length / 2;
        const boolLikeCount = values.filter((v) => v === true || v === false || v == "true" || v == "false").length;
        const isBoolLike = boolLikeCount > values.length / 2;

        if (isNumberLike) {
          const numericValues = values.filter((v) => typeof v === "number");
          const avg = Math.round((numericValues.reduce((acc, v) => acc + v, 0) / numericValues.length) * 100) / 100;
          result[category][questionID] = { value: avg };
        } else {
          const freq = {};
          for (const v of values) {
            freq[v] = (freq[v] || 0) + 1;
          }
          const maxFreq = Math.max(...Object.values(freq));
          const topValues = Object.keys(freq).filter((k) => freq[k] === maxFreq);
          // yesRate: fraction of true responses
          const yesRate = isBoolLike ? Math.round((values.filter((v) => v === true).length / boolLikeCount) * 100) / 100 : undefined;
          if (topValues.length === 1) {
            result[category][questionID] = { value: topValues[0], frequency: Math.round((maxFreq / values.length) * 100) / 100, totalCount: values.length, yesRate };
          } else {
            result[category][questionID] = { value: isBoolLike ? topValues[0] : "Mixed", frequency: Math.round((maxFreq / values.length) * 100) / 100, totalCount: values.length, yesRate };
          }
        }
      }
    }
    allTeamAverages[teamKey] = result;
  }
  return allTeamAverages;
}

export async function getAllScoutedLbColums() {}

// #choice-popup used in /admin files
// [{ label, onClick }]
export function showChoicePopup(headerText, choices) {
  const popup = document.getElementById("choice-popup");
  const header = document.getElementById("choice-header");
  const list = popup.querySelector(".c-list");
  const template = document.getElementById("choice-btn-template");
  const closeBtn = document.getElementById("close-frame-btn");

  header.textContent = headerText;
  list.querySelectorAll(".choice-btn").forEach((el) => el.remove());

  choices.forEach(({ label, icon, onClick }) => {
    const btn = template.cloneNode(true);
    const thing = btn.querySelector(".btn-icon");
    btn.removeAttribute("id");
    btn.classList.remove("hidden");
    if (icon == "none") {
      thing.remove();
    }
    thing.name = icon || "add-circle";
    btn.classList.add("choice-btn");
    btn.lastChild.textContent = label;
    btn.addEventListener("click", () => {
      hideChoicePopup();
      onClick?.();
    });
    list.appendChild(btn);
  });

  if (!closeBtn.dataset.wired) {
    closeBtn.addEventListener("click", hideChoicePopup);
    closeBtn.dataset.wired = "true";
  }

  popup.classList.remove("choice-hidden");
}

export function hideChoicePopup() {
  document.getElementById("choice-popup")?.classList.add("choice-hidden");
}

window.reloadPage = function () {
  const eventKey = localStorage.getItem("currentEventKey");
  const CACHE_KEY = `eventCache_${eventKey}`;
  localStorage.removeItem(CACHE_KEY);
  location.reload();
};

window.logout = (param) => {
  if (param === "redirect=scout") {
    // Switch profile without re-login — keep auth token
    localStorage.removeItem("userProfile");
    const eventKey = localStorage.getItem("currentEventKey");
    const eventParam = eventKey ? `&eventKey=${eventKey}` : "";
    window.location = `/HTML/profiles.html?redirect=scout${eventParam}`;
    return;
  }
  localStorage.removeItem("scoutingAuthToken");
  localStorage.removeItem("userProfile");
  window.location = `/HTML/login.html`;
};
