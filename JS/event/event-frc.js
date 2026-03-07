import { newEventCache } from "../utils.js";
import { loadLeaderboard } from "./leaderboard.js";
import { questionDB } from "../DB.js";
const eventNameHeader = document.getElementById("eventNameHeader");
const slot = document.getElementById("slot-text");
const eventCodeHeader = document.getElementById("eventCodeHeader");
const urlParams = new URLSearchParams(window.location.search);
const offlineScoutBtn = document.getElementById("btn-offline");
const loadingOverlay = document.getElementById("loading-overlay");
const nextPageBtn = document.getElementById("nextPageBtn");
const bodyLeft = document.querySelector(".body-left");
const bodyRight = document.querySelector(".body-right");

const scrollBtn = document.querySelector(".scroll-btn");

var inspectedMatch = null;
const eventKey = urlParams.get("eventKey") || null;
var currentPage = "R";

const CACHE_KEY = `eventCache_${eventKey}`;
localStorage.setItem("currentEventKey", eventKey);

async function renderMatches(mData) {
  const dividerEl = document.querySelector("#ls-divider");
  const matchtemplate = document.getElementById("ml-template");
  var lastMatchType = "";
  var lastMatchCompleted = false;

  var delay = 0;

  for (const match of mData) {
    const matchEl = matchtemplate.cloneNode(true);
    const matchIdEl = matchEl.querySelector("#match-id");

    // dividers for quals, semis, finals
    if (match.comp_level !== lastMatchType) {
      const thisDivider = dividerEl.cloneNode(true);
      if (match.comp_level === "qm") {
        thisDivider.textContent = "- Qualifiers -";
      } else if (match.comp_level === "sf") {
        thisDivider.textContent = "- Semifinals -";
      } else if (match.comp_level === "f") {
        thisDivider.textContent = "- Finals -";
      }
      thisDivider.classList.remove("hidden");
      dividerEl.parentNode.appendChild(thisDivider);
      lastMatchType = match.comp_level;
    }

    // concat a 0 before numbers less than 10 (03)
    var matchNum = match.match_number;
    if (match.comp_level === "sf") {
      matchNum = match.set_number;
    }
    matchIdEl.textContent = matchNum < 10 ? `0${matchNum}` : matchNum;

    for (let i = 0; i < 3; i++) {
      const blueTeamEl = matchEl.querySelector("#m-blue").querySelector(`#team${i + 1}`);
      const redTeamEl = matchEl.querySelector("#m-red").querySelector(`#team${i + 1}`);

      blueTeamEl.textContent = match.alliances.blue.team_keys[i].slice(3);
      redTeamEl.textContent = match.alliances.red.team_keys[i].slice(3);
    }

    const redScoreEl = matchEl.querySelector("#match-red-score");
    const blueScoreEl = matchEl.querySelector("#match-blue-score");

    redScoreEl.textContent = `${match.alliances.red.score === (-1 || null) ? "-" : match.alliances.red.score}`;
    blueScoreEl.textContent = `${match.alliances.blue.score === (-1 || null) ? "-" : match.alliances.blue.score}`;

    const isCompleted = match.alliances.red.score !== (null || -1) && match.alliances.blue.score !== (null || -1);

    if (isCompleted) {
      matchEl.querySelector("#match-status").setAttribute("name", "cloud-done-outline");
    } else {
      if (lastMatchCompleted) {
        matchEl.classList.add("match-theme-active");
        matchEl.querySelector("#match-status").setAttribute("name", "play-circle-outline");
      } else {
        matchEl.querySelector("#match-status").setAttribute("name", "hourglass-outline");
      }
    }

    if (match.winning_alliance === "blue") {
      matchEl.classList.add("theme-blue-victory");
      blueScoreEl.classList.add("winner");
    } else if (match.winning_alliance === "red") {
      matchEl.classList.add("theme-red-victory");
      redScoreEl.classList.add("winner");
    } else {
      matchEl.classList.add("theme-tie");
    }

    const actionBtn = matchEl.querySelector("#action-btn");

    actionBtn.addEventListener("click", () => {
      if (!actionBtn.classList.contains("hidden")) {
        //&& !isCompleted
        location.href = `../HTML/scout.html?eventKey=${eventKey}&matchKey=${match.key}`;
      }
    });

    //inspection toggle
    matchEl.addEventListener("click", () => {
      if (inspectedMatch && inspectedMatch.key !== match.key) {
        const prevInspectedEl = document.getElementById(`match-${inspectedMatch.key}`);
        prevInspectedEl.querySelector("#teams-table").classList.remove("overlapped");

        prevInspectedEl.querySelector("#action-btn").classList.add("hidden");
      }
      actionBtn.classList.toggle("hidden");
      matchEl.querySelector("#teams-table").classList.toggle("overlapped");
      inspectedMatch = match;
      if (!isCompleted) {
        actionBtn.innerHTML = `
        <ion-icon class="ionicon" name="open-outline"></ion-icon> Inspect This Match`;
      } else {
        location.href = `/HTML/inspect.html?type=match&key=${match.key}`;
        actionBtn.innerHTML = `
        <ion-icon class="ionicon" name="open-outline"></ion-icon> Review this match`;
      }
    });

    lastMatchCompleted = isCompleted;
    matchEl.id = `match-${match.key}`;
    matchEl.classList.add("hidden");
    matchtemplate.parentNode.appendChild(matchEl);

    delay += 13;
    setTimeout(() => {
      matchEl.classList.remove("hidden");
    }, delay);
  }
  matchtemplate.classList.add("hidden"); // dont delete for refreshing w/o fetches
}

function nextPage() {
  if (currentPage == "R") {
    currentPage = "L";
    bodyRight.style.display = "none";
    bodyLeft.style.display = "flex";
    nextPageBtn.innerHTML = `<ion-icon name="game-controller-outline" role="img" class="md hydrated"></ion-icon>`;
  } else {
    currentPage = "R";
    bodyRight.style.display = "flex";
    bodyLeft.style.display = "none";
    nextPageBtn.innerHTML = `<ion-icon name="trophy-outline" role="img" class="md hydrated"></ion-icon>`;
  }
}

nextPageBtn.addEventListener("click", nextPage);

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    if (!eventKey) {
      location.href = "index.html";
      return;
    }

    const cachedBundle = localStorage.getItem(CACHE_KEY);

    let mData, eventDetails;

    if (cachedBundle) {
      console.log("Using cached event bundle");
      ({ mData, eventDetails } = JSON.parse(cachedBundle));
    } else {
      console.log("No cached data, fetching from TBA");
      ({ mData, eventDetails } = await newEventCache(eventKey, () => questionDB("GET")));
    }
    const eventName = `${eventDetails.year} ${eventDetails.district?.abbreviation?.toUpperCase() || eventDetails.short_name} ${eventDetails.short_name} Event`;
    eventNameHeader.textContent = eventName;
    eventCodeHeader.textContent = eventKey || "Event Code";

    const userData = JSON.parse(localStorage.getItem("userProfile"));
    if (userData.matches && userData.matches.slot) {
      slot.textContent = userData.slot;
    } else {
      slot.textContent = "No Position";
    }

    renderMatches(mData);
    loadLeaderboard();
  })();
});

scrollBtn.addEventListener("click", () => {
  document.querySelector(".match-theme-active")?.scrollIntoView({ block: "center", behavior: "smooth" });
});

window.reloadPage = function () {
  localStorage.removeItem(CACHE_KEY);
  location.reload();
};

offlineScoutBtn.onclick = function () {
  location.href = `../HTML/scout.html?status=offline&eventKey=${eventKey}`;
};

/* [
  {
    start: 1,
    end: 5,
    slot: "blue1",
  },
  {
    start: 6,
    end: 10,
    slot: "red3",
  },
]; */

window.nextPage = nextPage;
