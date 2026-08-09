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
  }
});

formName.addEventListener("input", updateEvent);
formStart.addEventListener("input", updateEvent);
formEnd.addEventListener("input", updateEvent);
formLocation.addEventListener("input", updateEvent);
