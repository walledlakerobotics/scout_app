import { showChoicePopup } from "/JS/utils.js";
import { getUsers, updateUser, addUser, deleteUser } from "/JS/DB.js";

const tbody = document.getElementById("scouters-tbody");
const rowTemplate = document.getElementById("scouter-row-template");
const addScouterBtn = document.getElementById("add-scouter-btn");

let users = [];

async function loadUsers() {
  users = await getUsers();
  renderRows();
}

function renderRows() {
  tbody.querySelectorAll("tr:not(#scouter-row-template)").forEach((row) => row.remove());
  users.forEach((user) => {
    const row = rowTemplate.cloneNode(true);
    row.removeAttribute("id");
    row.classList.remove("hidden");
    row.querySelector(".s-id").textContent = user.id;
    row.querySelector(".s-name").textContent = user.name;
    row.querySelector(".s-role").textContent = user.role;
    row.querySelector(".s-team").textContent = user.team;
    row.querySelector(".s-scouting").textContent = user.scouting;
    row.addEventListener("click", () => openEditPopup(user));
    tbody.appendChild(row);
  });
}

async function applyUpdate(user, updates) {
  Object.assign(user, updates); // optimistic update
  renderRows();
  try {
    await updateUser(user.id, updates);
  } catch (err) {
    console.error("Failed to update user:", err);
    alert("Failed to save that change. Reloading the scouters list.");
    await loadUsers();
  }
}

function rename(user) {
  const newName = prompt("New Name:", user.name);
  if (!newName || newName === user.name) return;
  applyUpdate(user, { name: newName });
}

function reTeam(user) {
  const newTeam = prompt("New Team Number:", user.team);
  if (!newTeam || newTeam === user.team) return;
  applyUpdate(user, { team: newTeam });
}

function role(user) {
  showChoicePopup(`Change ${user.name}'s role to:`, [
    {
      label: "ADMIN",
      icon: "shield-half",
      onClick: () => applyUpdate(user, { role: "admin" }),
    },
    {
      label: "SCOUT",
      icon: "person",
      onClick: () => applyUpdate(user, { role: "scout" }),
    },
  ]);
}

function position(user) {
  const positions = ["Blue 1", "Blue 2", "Blue 3", "Red 1", "Red 2", "Red 3"];
  showChoicePopup(
    `Change ${user.name}'s position to:`,
    positions.map((label) => ({
      label,
      icon: label.startsWith("Blue") ? "arrow-back" : "arrow-forward",
      // remove spaces and lowercase before storing, per convention
      onClick: () => applyUpdate(user, { scouting: label.replace(/\s+/g, "").toLowerCase() }),
    }))
  );
}

async function deleteScouter(user) {
  if (!confirm(`Delete ${user.name}? This can't be undone.`)) return;
  try {
    await deleteUser(user.id);
    users = users.filter((u) => u.id !== user.id);
    renderRows();
  } catch (err) {
    console.error("Failed to delete user:", err);
    alert("Failed to delete that scouter.");
  }
}

function openEditPopup(user) {
  showChoicePopup(`Edit Property of ${user.name}:`, [
    {
      label: "Name",
      icon: "none",
      onClick: () => rename(user),
    },
    {
      label: "Role",
      icon: "none",
      onClick: () => role(user),
    },
    {
      label: "Team Number",
      icon: "none",
      onClick: () => reTeam(user),
    },
    {
      label: "Position",
      icon: "none",
      onClick: () => position(user),
    },
    {
      label: "Delete Scouter",
      icon: "trash",
      onClick: () => deleteScouter(user),
    },
  ]);
}

addScouterBtn.addEventListener("click", async () => {
  const name = prompt("New Scouter's Name:");
  if (!name) return;

  const newUser = { name, role: "scout", team: "", scouting: "" };
  try {
    const { id } = await addUser(newUser);
    newUser.id = id;
    users.push(newUser);
    renderRows();
  } catch (err) {
    console.error("Failed to add user:", err);
    alert("Failed to add that scouter.");
  }
});

loadUsers();
