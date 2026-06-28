import { questionDB } from "/JS/DB.js";
import { populateQuestions } from "/JS/utils.js";

const tabTemplate = document.getElementById("tab-template");
const newTabBtn = document.getElementById("new-tab-btn");
const tabHeader = document.getElementById("tab-header");
const tabList = document.querySelector(".tablist");
const inputList = document.getElementById("input-list");

var eventKey = localStorage.getItem("currentEventKey") || null;

var questionsData = {};
var currentSelectedTabKey = null;
var lastSelectedTabKey = null;

async function selectTab(key) {
  lastSelectedTabKey = currentSelectedTabKey;
  currentSelectedTabKey = key;
  tabHeader.textContent = key.toUpperCase();
  document.getElementById(`tab-${lastSelectedTabKey}`)?.classList.remove("activeTab");
  document.getElementById(`tab-${currentSelectedTabKey}`)?.classList.add("activeTab");

  if (lastSelectedTabKey === null) {
    document.querySelectorAll(".tab-selected").forEach((el) => el.classList.remove("tab-selected"));
    tabList.style = "";
  }
  let cache = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`));
  const data = cache.questionsData.data;
  const questions = structuredClone(data);

  inputList.innerHTML = "";

  await populateQuestions(questions, key, inputList);

  // Wrap each populated question in a .question div
  const children = Array.from(inputList.children);
  children.forEach((el, i) => {
    const wrapper = document.createElement("div");
    wrapper.className = "question";

    const qIndex = document.createElement("h3");
    qIndex.textContent = i + 1;

    const wrapper2 = document.createElement("div");
    wrapper2.className = "q-wrapper-right";

    const interactBtn = document.createElement("button");
    interactBtn.id = "restart-btn";
    interactBtn.className = "mini-btn";
    interactBtn.innerHTML = `<ion-icon name="finger-print"></ion-icon>`;

    wrapper2.appendChild(qIndex);
    wrapper2.appendChild(interactBtn);

    inputList.insertBefore(wrapper, el);

    wrapper.appendChild(el);
    wrapper.appendChild(wrapper2);
  });
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

async function init() {
  questionsData = await questionDB("GET");
  const categories = questionsData?.data;
  Object.keys(categories).forEach((key) => {
    createNewTab(key);
  });
}
init();
