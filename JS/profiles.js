import { getUserTeam } from "./utils.js";
import { getUsers } from "./DB.js";
const teamLabel = document.getElementById("team");

const currentUserData = JSON.parse(localStorage.getItem("userProfile")) || null;
if (currentUserData && currentUserData.name) {
  const urlParams = new URLSearchParams(window.location.search);
  const eventKey = urlParams.get("eventKey");
  window.location = `../HTML/event-frc.html?eventKey=${eventKey}`;
  //push them to the next page if they already have a profile
}

(async () => {
  const userTeam = getUserTeam();
  const users = await getUsers();
  const profileBtn = document.getElementById("profileBtn");
  const parentNode = profileBtn.parentNode;
  var delay = 0;
  for (const user of users) {
    if (user.team === userTeam) {
      const thisBtn = profileBtn.cloneNode(true);
      thisBtn.style.display = "flex";
      thisBtn.textContent = `${user.name} →`;
      parentNode.appendChild(thisBtn);
      setTimeout(() => {
        thisBtn.classList.remove("invisible");
      }, delay);
      thisBtn.addEventListener("click", () => {
        localStorage.setItem("userProfile", JSON.stringify(user));
        window.location = `../HTML/index.html`;
      });
      console.log(user);
    }
    delay += 80;
  }

  teamLabel.textContent = `- ${userTeam} Scouters -`;
})();
