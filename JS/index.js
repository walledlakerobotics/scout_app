import { TBA_GET, getUserTeam, isActiveEvent } from "./utils.js";

const urlParams = new URLSearchParams(window.location.search);
const setupBtn = document.getElementById("setupBtn");

const msg = urlParams.get("msg");
if (msg) {
  const msgBox = document.getElementById("errMsg");
  msgBox.textContent = decodeURIComponent(msg);
  msgBox.classList.remove("hidden");
}

const eventBtn = document.getElementById("eventBtn");
eventBtn.classList.add("eventBtn");

var validEvent = false;
var nextValidEvent = null;
//hemmy boy!!!!

(async () => {
  const { isActive, event } = await isActiveEvent(); // horrendous naming

  if (isActive) {
    console.log(event);
    eventBtn.classList.add("validEvent");
    eventBtn.innerText = `${event.name} →`;
    validEvent = event;
  } else {
    eventBtn.classList.add("noEvent");
    eventBtn.innerText = "[ No Current Event ]";

    nextValidEvent = event;

    // just thought this looked cool
    let showBrackets = false;
    setInterval(() => {
      eventBtn.innerText = showBrackets ? "[ No Current Event ]" : "No Current Event";
      showBrackets = !showBrackets;
    }, 1000);
  }
})();

eventBtn.addEventListener("click", () => {
  // add admin features + secure identification in cloudflare worker later
  if (validEvent) {
    const uProfile = JSON.parse(localStorage.getItem("userProfile")) || null;
    if (uProfile && uProfile.name) {
      window.location = `../HTML/event-frc.html?eventKey=2025mimil`; //`../HTML/event-frc.html?eventKey=${validEvent.key}`;
    } else {
      window.location = `../HTML/profiles.html?eventKey=${validEvent.key}`;
    }
  } else {
    const errorMsg = document.getElementById("errMsg");
    errorMsg.textContent = `Event scouting won't resume until ${new Date(nextValidEvent.start_date).toDateString()}, at ${nextValidEvent.location_name}. See you there!`;
    errorMsg.classList.remove("hidden");
  }
});

setupBtn.addEventListener("click", () => {
  const success = false;
});
