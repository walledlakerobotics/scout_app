import { questionDB } from "/JS/DB.js";
const editJsonBtn = document.getElementById("editJsonBtn");
const jsonEdit = document.querySelector(".json-edit");
const jsonInput = document.getElementById("jsonInput");
const saveJsonBtn = document.getElementById("saveJsonBtn");
const cancelJsonBtn = document.getElementById("cancelJsonBtn");
const mainBtns = document.querySelector(".main-buttons");
const errorMsg = document.getElementById("errMsg");
const jsonHeader = document.getElementById("jsonHeader");
const header = document.getElementById("header");

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
}

editJsonBtn.addEventListener("click", async () => {
  jsonEdit.classList.remove("hidden");
  mainBtns.classList.add("hidden");
  header.classList.add("hidden");

  const questionsData = await questionDB("GET");
  console.log(questionsData);
  const json = questionsData.data || {};
  const version = questionsData.version || "?";
  jsonInput.value = JSON.stringify(json, null, 4);
  jsonHeader.textContent = `Questions JSON (v${version})`;
});

cancelJsonBtn.addEventListener("click", () => {
  jsonEdit.classList.add("hidden");
  mainBtns.classList.remove("hidden");
  header.classList.remove("hidden");
});

saveJsonBtn.addEventListener("click", async () => {
  const jsonData = jsonInput.value;
  try {
    const parsedData = JSON.parse(jsonData);
    // Here you would typically send the parsedData to your server or process it as needed
    console.log("Parsed JSON:", parsedData);

    const result = await questionDB("POST", parsedData);
    console.log("Save Result:", result);

    jsonEdit.classList.add("hidden");
    mainBtns.classList.remove("hidden");
    header.classList.remove("hidden");
  } catch (error) {
    showError("Invalid JSON. Please correct the format and try again.");
    console.error("JSON Parsing Error:", error);
  }
});
