import { isAdmin } from "./utils.js";
import { getUsers } from "./DB.js";
const teamLabel = document.getElementById("team");
const profileBtnGuest = document.getElementById("profileBtnGuest");

const urlParams = new URLSearchParams(window.location.search);
const redirectToScout = urlParams.get("redirect") === "scout";
const eventKey = urlParams.get("eventKey") || localStorage.getItem("currentEventKey");

const currentUserData = JSON.parse(localStorage.getItem("userProfile")) || null;
if (currentUserData && currentUserData.name && !redirectToScout) {
  window.location = `../HTML/event-frc.html?eventKey=${eventKey}`;
  //push them to the next page if they already have a profile
}

function goAfterProfile() {
  if (redirectToScout && eventKey) {
    window.location = `../HTML/scout.html?eventKey=${eventKey}`;
  } else if (redirectToScout) {
    window.location = `../HTML/index.html`;
  } else {
    window.location = `../HTML/index.html`;
  }
}

(async () => {
  const users = await getUsers();
  const profileBtn = document.getElementById("profileBtn");
  const parentNode = profileBtn.parentNode;

  var delay = 0;
  console.log(users);
  //const isAdminSelect = ;
  const adminMode = isAdmin();
  for (const user of users) {
    const match = (adminMode ? user.role === "admin" : user.role !== "admin") && user.role !== "guest";
    if (match) {
      const thisBtn = profileBtn.cloneNode(true);
      thisBtn.style.display = "flex";
      thisBtn.textContent = `${user.name} →`;
      if (user.team) thisBtn.classList.add(`team-${user.team}`);
      parentNode.appendChild(thisBtn);
      setTimeout(() => {
        thisBtn.classList.remove("invisible");
      }, delay);
      thisBtn.addEventListener("click", () => {
        localStorage.setItem("userProfile", JSON.stringify(user));
        goAfterProfile();
      });
      console.log(user);
    }
    delay += 40;
  }
  profileBtnGuest.addEventListener("click", () => {
    const result = users.filter((item) => item.id === "-1");
    localStorage.setItem("userProfile", JSON.stringify(result[0]));
    console.log(result);
    goAfterProfile();
  });
  teamLabel.textContent = adminMode ? `- Head Scouts -` : `- General Scouters -`;
})();
