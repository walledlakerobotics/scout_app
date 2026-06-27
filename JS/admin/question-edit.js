import { questionDB } from "/JS/DB.js";

const tabTemplate = document.getElementById("tab-template");
const newTabBtn = document.getElementById("new-tab-btn");
const tabHeader = document.getElementById("tab-header");

var questionsData = {};
var currentSelectedTabKey = null;
var lastSelectedTabKey = null;

function selectTab(key) {
  lastSelectedTabKey = currentSelectedTabKey;
  currentSelectedTabKey = key;
  tabHeader.textContent = key.toUpperCase();
  document.getElementById(`tab-${lastSelectedTabKey}`)?.classList.remove("activeTab");
  document.getElementById(`tab-${currentSelectedTabKey}`)?.classList.add("activeTab");

  if (lastSelectedTabKey === null) {
    document.querySelectorAll(".tab-selected").forEach((el) => el.classList.remove("tab-selected"));
  }
}

function createNewTab(key) {
  const thisTab = tabTemplate.cloneNode(true);
  thisTab.id = `tab-${key}`;
  thisTab.lastChild.textContent = key.toUpperCase();

  thisTab.addEventListener("click", () => {
    selectTab(key);
  });

  tabTemplate.parentNode.appendChild(thisTab);
  tabTemplate.parentNode.appendChild(newTabBtn);
}

newTabBtn.addEventListener("click", () => {
  const res = prompt("New Category's Name:");
  if (res) {
    createNewTab(res);
  }
});

async function loadFromJSON() {
  questionsData = await questionDB("GET");
  const categories = questionsData?.data;
  Object.keys(categories).forEach((key) => {
    createNewTab(key);
  });
}
loadFromJSON();
