import { newEvent } from "../DB.js";

const newEventBtn = document.getElementById("new-event-btn");
const formContainer = document.getElementById("form");
const eventsContainer = document.getElementById("events");

const formName = document.getElementById("event-name");
const formStart = document.getElementById("event-start-date");
const formEnd = document.getElementById("event-end-date");
const formLocation = document.getElementById("event-location");

const readoutName = document.getElementById("ro-name");
const readoutKey = document.getElementById("ro-key");
const readoutDur = document.getElementById("ro-duration");

const cancelBtn = document.getElementById("cancel-creation-btn");
const createBtn = document.getElementById("create-btn");

const header = document.getElementById("header");

var event = {};
function updateEvent() {
  event = {
    name: formName.value,
    start_date: formStart.value,
    end_date: formEnd.value,
    location_name: formLocation.value,
  };

  var durationDays = (Date.parse(event.end_date) - Date.parse(event.start_date)) / 1000 / 60 / 60 / 24;
  if (durationDays < 1) durationDays = false;

  readoutDur.textContent = `${durationDays || "INVALID"} Days`;

  const words = event.name.split(" ");
  const nameWords = [];
  for (let i = 2; i <= words.length - 2; i++) {
    nameWords.push(words[i]);
  }
  const shortName = nameWords.join(" ");
  var eventKey;
  readoutName.textContent = shortName || "-";

  if (shortName) {
    eventKey = `2026wlros-${shortName.slice(0, 3)}`;
  }
  readoutKey.textContent = eventKey || "-";

  event.key = eventKey;
  event.short_name = shortName;
}
updateEvent();

const tbody = document.getElementById("scouters-tbody");
const rowTemplate = document.getElementById("scouter-row-template");

let TEMPLATE_FULL = [
  {
    actual_time: 1774709572,
    alliances: {
      blue: {
        dq_team_keys: [],
        score: 595,
        surrogate_team_keys: [],
        team_keys: ["frc5460", "frc3322", "frc1506"],
      },
      red: {
        dq_team_keys: [],
        score: 78,
        surrogate_team_keys: [],
        team_keys: ["frc4994", "frc3604", "frc11455"],
      },
    },
    comp_level: "qm",
    event_key: "2026misal",
    key: "2026misal_qm1",
    match_number: 1,
    post_result_time: 1774709766,
    predicted_time: 1774710000,
    score_breakdown: {
      blue: {
        adjustPoints: 0,
        autoTowerPoints: 0,
        autoTowerRobot1: "None",
        autoTowerRobot2: "None",
        autoTowerRobot3: "None",
        endGameTowerPoints: 10,
        endGameTowerRobot1: "None",
        endGameTowerRobot2: "Level1",
        endGameTowerRobot3: "None",
        energizedAchieved: true,
        foulPoints: 0,
        g206Penalty: false,
        hubScore: {
          autoCount: 46,
          autoPoints: 46,
          endgameCount: 137,
          endgamePoints: 137,
          shift1Count: 0,
          shift1Points: 0,
          shift2Count: 172,
          shift2Points: 172,
          shift3Count: 0,
          shift3Points: 0,
          shift4Count: 181,
          shift4Points: 181,
          teleopCount: 539,
          teleopPoints: 539,
          totalCount: 585,
          totalPoints: 585,
          transitionCount: 49,
          transitionPoints: 49,
          uncounted: 4,
        },
        majorFoulCount: 0,
        minorFoulCount: 0,
        penalties: "None",
        rp: 5,
        superchargedAchieved: true,
        totalAutoPoints: 46,
        totalPoints: 595,
        totalTeleopPoints: 549,
        totalTowerPoints: 10,
        traversalAchieved: false,
      },
      red: {
        adjustPoints: 0,
        autoTowerPoints: 0,
        autoTowerRobot1: "None",
        autoTowerRobot2: "None",
        autoTowerRobot3: "None",
        endGameTowerPoints: 0,
        endGameTowerRobot1: "None",
        endGameTowerRobot2: "None",
        endGameTowerRobot3: "None",
        energizedAchieved: false,
        foulPoints: 0,
        g206Penalty: false,
        hubScore: {
          autoCount: 31,
          autoPoints: 31,
          endgameCount: 0,
          endgamePoints: 0,
          shift1Count: 20,
          shift1Points: 20,
          shift2Count: 0,
          shift2Points: 0,
          shift3Count: 26,
          shift3Points: 26,
          shift4Count: 0,
          shift4Points: 0,
          teleopCount: 47,
          teleopPoints: 47,
          totalCount: 78,
          totalPoints: 78,
          transitionCount: 1,
          transitionPoints: 1,
          uncounted: 0,
        },
        majorFoulCount: 0,
        minorFoulCount: 0,
        penalties: "None",
        rp: 0,
        superchargedAchieved: false,
        totalAutoPoints: 31,
        totalPoints: 78,
        totalTeleopPoints: 47,
        totalTowerPoints: 0,
        traversalAchieved: false,
      },
    },
    time: 1774710000,
    winning_alliance: "blue",
  },
];

let match_template = [
  {
    alliances: {
      blue: {
        score: -7,
        team_keys: ["frc0", "frc1", "frc12345"],
      },
      red: {
        score: -7,
        team_keys: ["frc0", "frc1", "frc456789"],
      },
    },
    key: "2026misal_qm1",
    match_number: 1,
    winning_alliance: "blue",
  },
];

const addMatchBtn = document.getElementById("add-match-btn");
const SCHEDULE_STORAGE_KEY = "manageEventsSchedule";

// New rows follow match_template's shape: no score yet (-7, matching the
// "unplayed" sentinel other pages check for via `score >= 0`), no winner yet.
function createMatch(matchNumber) {
  return {
    alliances: {
      blue: { score: -7, team_keys: ["", "", ""] },
      red: { score: -7, team_keys: ["", "", ""] },
    },
    key: `${event.key || "manual"}_qm${matchNumber}`,
    match_number: matchNumber,
    winning_alliance: null,
  };
}

function loadMatches() {
  try {
    const stored = JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY));
    if (Array.isArray(stored) && stored.length) return stored;
  } catch {}
  return [createMatch(1)];
}

function saveMatches() {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(matches));
}

let matches = loadMatches();

function teamNumberFromKey(key) {
  return (key || "").replace(/^frc/, "");
}
function teamKeyFromNumber(number) {
  const trimmed = (number || "").trim();
  return trimmed ? `frc${trimmed}` : "";
}

const ALLIANCE_CELLS = [
  [".r-blue1", "blue", 0],
  [".r-blue2", "blue", 1],
  [".r-blue3", "blue", 2],
  [".r-red1", "red", 0],
  [".r-red2", "red", 1],
  [".r-red3", "red", 2],
];

function renderRows() {
  tbody.querySelectorAll("tr:not(#scouter-row-template)").forEach((row) => row.remove());
  matches.forEach((match, index) => {
    match.match_number = index + 1;

    const row = rowTemplate.cloneNode(true);
    row.removeAttribute("id");
    row.classList.remove("hidden");

    row.querySelector(".r-round-num").textContent = match.match_number;

    ALLIANCE_CELLS.forEach(([selector, alliance, slot]) => {
      const input = row.querySelector(`${selector} input`);
      input.value = teamNumberFromKey(match.alliances[alliance].team_keys[slot]);
      input.addEventListener("input", () => {
        match.alliances[alliance].team_keys[slot] = teamKeyFromNumber(input.value);
        saveMatches();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key !== " ") return;
        e.preventDefault();
        const inputs = Array.from(tbody.querySelectorAll(".team-input"));
        const next = inputs[inputs.indexOf(input) + 1];
        if (next) {
          next.focus();
          next.select();
        }
      });
    });

    row.querySelector(".row-delete-btn").addEventListener("click", () => {
      match.alliances.blue.team_keys = ["", "", ""];
      match.alliances.red.team_keys = ["", "", ""];
      saveMatches();
      renderRows();
    });

    tbody.appendChild(row);
  });
}

addMatchBtn.addEventListener("click", () => {
  matches.push(createMatch(matches.length + 1));
  saveMatches();
  renderRows();
});

renderRows();

newEventBtn.addEventListener("click", () => {
  eventsContainer.style.display = "none";
  formContainer.style.display = "flex";
  newEventBtn.style.display = "none";

  header.textContent = "New Event";
});

cancelBtn.addEventListener("click", () => {
  eventsContainer.style.display = "flex";
  formContainer.style.display = "none";
  newEventBtn.style.display = "flex";

  header.textContent = "Events";
});

createBtn.addEventListener("click", async () => {
  var invalid = false;
  updateEvent();
  Object.entries(event).forEach(([key, value]) => {
    if (value == "" || value == null) {
      invalid = true;
    }
  });
  if (invalid) {
    confirm("Invalid Parameters: event not created");
    return;
  }
  console.log(event);
  const res = await newEvent(event);
  if (res.success) {
    confirm(`Created Event ${res.eventKey}`);
    cancelBtn.click();
  }
});

formName.addEventListener("input", updateEvent);
formStart.addEventListener("input", updateEvent);
formEnd.addEventListener("input", updateEvent);
formLocation.addEventListener("input", updateEvent);
