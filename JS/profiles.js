import { getUserTeam, isAdmin } from "./utils.js";
import { getUsers } from "./DB.js";
const teamLabel = document.getElementById("team");
const profileBtnGuest = document.getElementById("profileBtnGuest");

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
  console.log(users);
  //const isAdminSelect = ;
  const adminMode = isAdmin();
  for (const user of users) {
    const match = adminMode ? user.role === "admin" : user.team === userTeam && user.role !== "admin";
    if (match) {
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
  profileBtnGuest.addEventListener("click", () => {
    const result = users.filter((item) => item.id === "-1");
    localStorage.setItem("userProfile", JSON.stringify(result[0]));
    console.log(result);
    window.location = `../HTML/index.html`;
  });
  teamLabel.textContent = adminMode ? `- Head Scouts -` : `- ${userTeam} Scouters -`;
})();
