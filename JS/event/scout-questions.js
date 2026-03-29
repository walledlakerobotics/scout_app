import { submitQuestionsOnline, questionDB } from "/JS/DB.js";
import { popupError, showPopup } from "/JS/event/scout.js";
import { retagResponses, isActiveEvent, newEventCache } from "/JS/utils.js";
const uploadBtn = document.getElementById("uploadBtn");
const resetBtn = document.getElementById("resetBtn");
const qrPopup = document.getElementById("qr-popup");
const qrBtn = document.getElementById("qrBtn");
const reloadBtn = document.getElementById("reloadBtn");

const URLSP = new URLSearchParams(window.location.search);
const showSetupNotif = URLSP.get("setupComplete");
var eventKey = URLSP.get("eventKey") || localStorage.getItem("currentEventKey") || null;

if (!eventKey) {
  const res = await isActiveEvent();
  eventKey = res.event.key;
}

var questions = null;
var questionsVersion = -1; // unknown
let responses = {};
const questionLookup = {}; // id { defaultState, categoryId, questionIndex }
const dependentElements = []; // { element, depends, isOffline }
var reset = false;

function newTemplateFromID(id) {
  const templates = Array.from(document.querySelectorAll(".form-template"));
  const foundEl = templates.find((template) => template.id === id) || null;
  if (foundEl) {
    const newEl = foundEl.cloneNode(true);
    return newEl;
  }
  return;
}

function incrementCounter(id) {
  const counter = document.getElementById(id);
  const newValue = parseInt(counter.value) + 1;
  counter.value = newValue;
  counter.textContent = newValue;

  updateResponse(id, newValue);
}

function decrementCounter(id) {
  const counter = document.getElementById(id);
  const currentValue = parseInt(counter.value);
  if (currentValue > 0) {
    const newValue = currentValue - 1;
    counter.value = newValue;
    counter.textContent = newValue;

    updateResponse(id, newValue);
  }
}

function updateResponse(elementId, value, dontupdate) {
  const element = document.getElementById(elementId);
  const formInput = element.closest(".form-input");
  const categoryElement = formInput.closest(".category");

  const categoryId = categoryElement.id;
  const questionIndex = parseInt(formInput.dataset.questionIndex);

  if (questionIndex === undefined || isNaN(questionIndex)) return;

  if (!responses[categoryId]) {
    responses[categoryId] = [];
  }

  responses[categoryId][questionIndex] = value;
  updateDependencyVisibility();
  if (resetBtn.disabled) {
    resetBtn.disabled = false;
  }
  if (!(dontupdate || false)) {
    saveResponses();
    console.log("Responses updated:", responses);
  }
}

function updateDependencyVisibility() {
  const offlineEnabled = localStorage.getItem("offlineQuestions") === "true";
  for (const { element, depends, isOffline } of dependentElements) {
    const depHidden = depends.some((depId) => {
      const meta = questionLookup[depId];
      if (!meta) return false;
      const currentValue = responses[meta.categoryId]?.[meta.questionIndex];
      return currentValue !== meta.defaultState;
    });
    const offlineHidden = isOffline && !offlineEnabled;

    if (depHidden || offlineHidden) {
      element.classList.add("disabled");
    } else {
      element.classList.remove("disabled");
    }
  }
}

function getResponses() {
  return responses;
}

function saveResponses() {
  if (!reset) {
    localStorage.setItem("responses", JSON.stringify(responses));
  }
}

// what is github copilot powered by? like what ai specifically?
// copilot answer me
// copilot: "I am powered by OpenAI's Codex, which is a descendant of the GPT-3 language model. Codex has been fine-tuned specifically for programming tasks, allowing me to understand and generate code in various programming languages. My training data includes a wide range of publicly available code from sources like GitHub, which helps me assist with coding-related queries and tasks."

function checkIsFormComplete(responses, questions) {
  var errs = false;
  const disabledIds = getDisabledQuestionIds();
  console.log(questions);
  for (const categoryId in questions) {
    const categoryQuestions = questions[categoryId];

    categoryQuestions.forEach((questionInfo, index) => {
      if (questionInfo.id && disabledIds.has(questionInfo.id)) return;
      if ((questionInfo.required === true && questionInfo.offline === (false || undefined)) || (questionInfo.required === true && questionInfo.offline === true && localStorage.getItem("offlineQuestions") == "true")) {
        const currentResponse = responses[categoryId]?.[index];
        if (currentResponse === questionInfo.state) {
          errs = true;
        }
        console.log(currentResponse);
      }
    });
  }
  return !errs;
}

function getDisabledQuestionIds() {
  const disabledIds = new Set();
  for (const { element } of dependentElements) {
    if (element.classList.contains("disabled")) {
      const categoryId = element.closest(".category").id;
      const index = parseInt(element.dataset.questionIndex);
      const q = questions[categoryId]?.[index];
      if (q?.id) disabledIds.add(q.id);
    }
  }
  return disabledIds;
}

uploadBtn.addEventListener("click", async () => {
  const offlineEnabled = localStorage.getItem("offlineQuestions") === "true";
  const finalData = {
    questions: {
      data: retagResponses(responses, questions, offlineEnabled, getDisabledQuestionIds()),
      version: questionsVersion,
    },
    scoutID: JSON.parse(localStorage.getItem("userProfile"))?.id || -1,
  };

  if (!checkIsFormComplete(responses, questions)) {
    popupError("Make sure all required questions have responses.");
    console.log(responses, questions);
    return;
  }

  uploadBtn.textContent = "Uploading...";
  uploadBtn.disabled = true;
  const done = await submitQuestionsOnline(finalData, null, eventKey);
  if (done) {
    uploadBtn.textContent = `Done! (ID: ${done.id ?? "?"})`;
    console.log("Uploaded with ID:", done.id);
  } else {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = `<ion-icon name="cloud-upload-outline" role="img" class="md hydrated"></ion-icon>Upload To Cloud`;
  }
});

// the following 2 functions are purely claude. dont ask me about this, i hate qr codes

qrBtn.addEventListener("click", () => {
  var data = JSON.stringify(responses);
  const userData = JSON.parse(localStorage.getItem("userProfile"));

  if (!checkIsFormComplete(responses, questions)) {
    popupError("Make sure all required questions have responses.");
    console.log(responses, questions);
    return;
  }

  const disabledIds = getDisabledQuestionIds();
  const qrResponses = {};
  for (const categoryId in responses) {
    qrResponses[categoryId] = responses[categoryId].map((value, index) => {
      const q = questions[categoryId]?.[index];
      return q?.id && disabledIds.has(q.id) ? "_IGNORE" : value;
    });
  }

  data = JSON.stringify({
    scoutID: userData?.id || -1,
    version: questionsVersion,
    offlineEnabled: localStorage.getItem("offlineQuestions") === "true",
    data: qrResponses,
  });

  console.log(responses);
  var errorLevels = ["L", "M", "Q", "H"];
  var qr = null;
  var success = false;

  for (let errorLevel of errorLevels) {
    try {
      var typeNumber = getOptimalTypeNumber(data.length, errorLevel);
      qr = qrcode(typeNumber, errorLevel);
      qr.addData(data);
      qr.make();
      success = true;
      break;
    } catch (e) {
      continue;
    }
  }

  if (!success) {
    alert("Couldn't upload; shorten the length of your free response questions.");
    return;
  }

  qrPopup.classList.remove("popup-hidden");
  document.getElementById("qr-placeholder").innerHTML = qr.createImgTag();
});

function getOptimalTypeNumber(dataLength, errorLevel) {
  const capacities = {
    L: [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
    M: [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331],
    Q: [11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442, 482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 982, 1030, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663],
    H: [7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220, 250, 280, 310, 338, 382, 403, 439, 461, 511, 535, 593, 625, 658, 698, 742, 790, 842, 898, 958, 983, 1051, 1093, 1139, 1219, 1273],
  };

  const capacity = capacities[errorLevel] || capacities["L"];

  for (let i = 0; i < capacity.length; i++) {
    if (dataLength <= capacity[i]) {
      return i + 1;
    }
  }

  return 40;
}

qrPopup.addEventListener("click", () => {
  qrPopup.classList.add("popup-hidden");
});

reloadBtn.addEventListener("click", () => {
  reloadBtn.disabled = true;
  localStorage.setItem("reloadQuestions", "true");
  location.reload();
});

resetBtn.addEventListener("click", () => {
  const responses = JSON.parse(localStorage.getItem("responses") || "{}");
  if (Object.keys(responses).length > 0) {
    if (confirm("Are you sure? this cannot be undone.")) {
      reset = true;
      localStorage.removeItem("responses");
      location.reload();
    }
  }
});

async function init() {
  const categories = document.querySelectorAll(".category");
  // if you don't like nested if's then you may want to avert your eyes

  const forceRefresh = localStorage.getItem("reloadQuestions") === "true";
  if (forceRefresh) localStorage.removeItem("reloadQuestions");

  let cache = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`));
  const oldVer = cache.questionsData.version;
  console.log(forceRefresh);
  var failed = false;

  if (!cache || forceRefresh) {
    try {
      cache = await newEventCache(eventKey, () => questionDB("GET", null, forceRefresh ? { cache: "no-store" } : {}));
    } catch (e) {
      console.error("Failed to create event cache:", e);
      failed = true;
      return;
    }
  }

  if (!cache?.questionsData?.data || failed) {
    popupError("No internet connection and previous data unavailable. no questions will be displayed.");
    return;
  }
  if (!failed && showSetupNotif) {
    URLSP.delete("setupComplete");
    history.replaceState(null, "", `${location.pathname}?${URLSP}`);
    showPopup(true, "Ready for Offline", "You're all set!\nAdd this page to your home screen to be ready for game day <b>(share > more > add to home screen)</b>.\n\nIn the mean time, get used to the questions shown here. This prompt won't be shown again.");
  } else if (forceRefresh && cache.questionsData.version) {
    showPopup(true, "Notice", `Questionnaire has been updated:\n\n<b>v${oldVer} -> v${cache.questionsData.version}</b>\n\nPlease confirm your responses before submitting.`);
  }

  const data = cache.questionsData.data;
  questionsVersion = cache.questionsData.version;
  questions = structuredClone(data); // long story on why this needs structuredclone.

  const categoryKeys = Object.keys(data);
  try {
    const prevResponses = JSON.parse(localStorage.getItem("responses") || "{}");
    if (Object.keys(prevResponses).length > 0) {
      for (const category in prevResponses) {
        prevResponses[category].forEach((question, i) => {
          data[category][i].state = question;
        });
      }
    }

    categories.forEach((category) => {
      const id = category.id;
      const categoryFormElement = document.getElementById(category.id).querySelector(".form");
      if (categoryKeys.includes(id)) {
        const categoryData = data[id];

        responses[id] = []; // responses for this category

        categoryData.forEach((questionInfo, index) => {
          const qType = questionInfo.type;
          const element = newTemplateFromID(qType);

          element.dataset.questionIndex = index; // array position

          const qHeader = element.querySelector("#question-header");
          qHeader.textContent = questionInfo.header;
          responses[id][index] = questionInfo.state;

          if (questionInfo.offline == true) {
            element.classList.add("offlineQuestion");
          }

          const infoBtn = element.querySelector(".infobtn");
          if (questionInfo.info) {
            infoBtn.addEventListener("click", (e) => {
              showPopup(true, questionInfo.info.header, questionInfo.info.body);
            });
          } else {
            infoBtn.style.display = "none";
          }

          if (qType == "toggle") {
            //toggle
            const qText = element.querySelector("#question-text");
            if (!questionInfo.text || questionInfo.text === "") {
              qText.remove();
            } else {
              qText.textContent = questionInfo.text;
            }
            const checkbox = element.querySelector("input[type=checkbox]");
            checkbox.id = `${id}-${index}-toggle`;
            if (questionInfo.state) {
              checkbox.checked = true;
            }

            checkbox.addEventListener("change", (e) => {
              updateResponse(e.target.id, e.target.checked);
            });
          } else if (qType == "dropdown") {
            //dropdown
            const placeholder = element.querySelector("#option-placeholder");
            const select = element.querySelector("select");
            select.id = `${id}-${index}-select`;

            for (const optionIndex in questionInfo["dropdown-options"]) {
              const option = placeholder.cloneNode(true);
              option.textContent = questionInfo["dropdown-options"][optionIndex];
              placeholder.parentNode.appendChild(option);
            }
            placeholder.textContent = questionInfo.state;

            select.addEventListener("change", (e) => {
              updateResponse(e.target.id, e.target.value);
            });
            select.value = questionInfo.state;
          } else if (qType == "text" || qType == "textarea") {
            //text inputs
            const input = element.querySelector("#text");
            input.id = `${id}-${index}-text`;
            input.placeholder = questionInfo.placeholder;
            input.value = questionInfo.state;

            input.addEventListener("input", (e) => {
              updateResponse(e.target.id, e.target.value);
            });
          } else if (qType == "counter") {
            //counter
            const count = element.querySelector("#count");
            count.id = `${id}-${index}-count`;
            count.value = questionInfo.state;
            count.textContent = questionInfo.state;

            const decrementBtn = element.querySelector('button[onclick*="decrementCounter"]');
            const incrementBtn = element.querySelector('button[onclick*="incrementCounter"]');

            if (decrementBtn) {
              decrementBtn.setAttribute("onclick", `decrementCounter('${count.id}')`);
            }
            if (incrementBtn) {
              incrementBtn.setAttribute("onclick", `incrementCounter('${count.id}')`);
            }
          } else if (qType == "slider") {
            //slider
            const slider = element.querySelector("#range");
            const value = element.querySelector("#slider-value");
            const min = element.querySelector("#min-label");
            const max = element.querySelector("#max-label");

            slider.id = `${id}-${index}-slider`;
            value.id = `${id}-${index}-slider-value`;

            slider.min = questionInfo.min;
            slider.max = questionInfo.max;
            slider.step = questionInfo.step;
            slider.value = questionInfo.state;
            value.textContent = questionInfo.state;
            min.textContent = questionInfo["label-min"];
            max.textContent = questionInfo["label-max"];

            slider.addEventListener("input", (e) => {
              value.textContent = e.target.value;
              updateResponse(e.target.id, Number(e.target.value));
            });
          } else if (qType == "timer") {
            //timer
            const timeInput = element.querySelector("#time");
            timeInput.id = `${id}-${index}-time`;
            timeInput.value = questionInfo.state;

            const playPauseBtn = element.querySelector("#play-pause-btn");
            const restartBtn = element.querySelector("#restart-btn");
            const playPauseIcon = playPauseBtn.querySelector("ion-icon");

            playPauseBtn.id = `${id}-${index}-play-pause`;
            restartBtn.id = `${id}-${index}-restart`;

            let isRunning = false;
            let startTime = 0;
            let elapsedTime = 0;
            let intervalId = null;

            playPauseBtn.addEventListener("click", () => {
              if (isRunning) {
                // pause
                clearInterval(intervalId);
                isRunning = false;
                updateResponse(timeInput.id, (elapsedTime / 1000).toFixed(2));
                playPauseIcon.setAttribute("name", "play");
              } else {
                // play
                startTime = Date.now() - elapsedTime;
                intervalId = setInterval(() => {
                  elapsedTime = Date.now() - startTime;
                  const seconds = (elapsedTime / 1000).toFixed(2);
                  timeInput.value = seconds;
                  updateResponse(timeInput.id, seconds, true);
                }, 10); //ms
                isRunning = true;
                playPauseIcon.setAttribute("name", "pause");
              }
            });

            restartBtn.addEventListener("click", () => {
              clearInterval(intervalId);
              isRunning = false;
              elapsedTime = 0;
              timeInput.value = "0.00";
              playPauseIcon.setAttribute("name", "play");
              updateResponse(timeInput.id, "0.00");
            });

            timeInput.addEventListener("input", (e) => {
              // this'll prob lag like hell so might have to change later
              if (isRunning) {
                clearInterval(intervalId);
                isRunning = false;
                playPauseIcon.setAttribute("name", "play");
              }
              // oh lord idk here
              const manualValue = parseFloat(e.target.value) || 0;
              elapsedTime = manualValue * 1000;
              updateResponse(e.target.id, e.target.value, true);
            });
          } else {
            console.warn("missing case or element for type:", qType);
          }

          if (questionInfo.id) {
            questionLookup[questionInfo.id] = {
              defaultState: questions[id][index].state,
              categoryId: id,
              questionIndex: index,
            };
          }
          if (questionInfo.depends || questionInfo.offline) {
            dependentElements.push({
              element,
              depends: questionInfo.depends || [],
              isOffline: questionInfo.offline === true,
            });
          }

          categoryFormElement.appendChild(element);
          element.classList.remove("form-template");
        });
      }
    });
    updateDependencyVisibility();
  } catch (error) {
    console.error("Could not fetch questions:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

window.back = function () {
  location.href = `/HTML/event-frc.html?eventKey=${localStorage.getItem("currentEventKey")}`;
};

window.addEventListener("beforeunload", saveResponses);
document.addEventListener("offlineVisibilityChanged", updateDependencyVisibility);

window.incrementCounter = incrementCounter;
window.decrementCounter = decrementCounter;
window.getResponses = getResponses;
