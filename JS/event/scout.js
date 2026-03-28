const popupElement = document.getElementById("popup");
const popupTitle = document.getElementById("popup-header");
const popupText = document.getElementById("popup-text");
const offlineBtn = document.getElementById("offline-btn");

const popupElipsis = document.querySelector(".btm");

let currentPage = 0;
let itemsPerPage = 3;

document.addEventListener("DOMContentLoaded", async () => {
  updateItemsPerPage();
  showCurrentPage();
  window.addEventListener("resize", handleResize);

  const isOffline = localStorage.getItem("offlineQuestions");
  if (isOffline === "true") {
    setOfflineQuestionsVisibility(true);
  } else {
    setOfflineQuestionsVisibility(false);
  }
});

export function showPopup(state, title, msg, autoSize) {
  autoSize = false; // keep this off
  if (autoSize) {
    popupElipsis.style.display = "none";
    popupElement.style.height = "fit-content";
  } else {
    popupElipsis.style.display = "block";
    popupElement.style.height = null;
  }
  if (state) {
    popupElement.classList.remove("popup-hidden");
    popupTitle.textContent = title || "Info";
    popupText.innerHTML = msg;
  } else {
    popupElement.classList.add("popup-hidden");
  }
}

function popupError(errorMsg) {
  showPopup(true, "Error", errorMsg, true);
}

function showOptions() {
  showPopup(true, "Settings", "Nothing here yet..");
}

function setOfflineQuestionsVisibility(visible) {
  const e = document.querySelectorAll(".offlineQuestion");
  for (const element of e) {
    if (visible) {
      element.classList.remove("disabled");
    } else {
      element.classList.add("disabled");
    }
  }
  document.dispatchEvent(new Event("offlineVisibilityChanged"));
  if (!offlineBtn) {
    return;
  }
  if (visible) {
    offlineBtn.innerHTML = `<ion-icon name="cloud-offline-outline"></ion-icon>`;
    localStorage.setItem("offlineQuestions", "true");
  } else {
    offlineBtn.innerHTML = `<ion-icon name="wifi-outline"></ion-icon>`;
    localStorage.setItem("offlineQuestions", "false");
  }
}

function toggleOfflineQuestions() {
  const isOffline = localStorage.getItem("offlineQuestions");
  if (!offlineBtn) {
    return;
  }
  if (isOffline == "true") {
    setOfflineQuestionsVisibility(false);
    alert("Hid offline-only questions. This means the venue has wifi.");
  } else if (isOffline == "false") {
    setOfflineQuestionsVisibility(true);
    alert("Now also showing offline-only questions. This should only be enabled if the entire venue lacks wifi.");
  }
}

function handleResize() {
  const oldItemsPerPage = itemsPerPage;
  updateItemsPerPage();

  if (oldItemsPerPage !== itemsPerPage) {
    const firstVisibleIndex = currentPage * oldItemsPerPage;
    currentPage = Math.floor(firstVisibleIndex / itemsPerPage);
    showCurrentPage();
  }
}

function updateItemsPerPage() {
  const width = window.innerWidth;
  if (width <= 700) {
    itemsPerPage = 1;
  } else if (width <= 1150) {
    itemsPerPage = 2;
  } else {
    itemsPerPage = 3;
  }
}

function showCurrentPage() {
  const categories = document.querySelectorAll(".category");
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  currentPage = Math.max(0, Math.min(currentPage, totalPages - 1));

  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  categories.forEach((category, index) => {
    if (index >= startIndex && index < endIndex) {
      category.style.display = "block";
    } else {
      category.style.display = "none";
    }
  });

  updateNavigationButtons(totalPages);
}

function updateNavigationButtons(totalPages) {
  const prevBtn = document.querySelector('button[onclick="prevPage()"]');
  const nextBtn = document.querySelector('button[onclick="nextPage()"]');

  if (prevBtn) {
    prevBtn.disabled = currentPage === 0;
    prevBtn.style.opacity = currentPage === 0 ? "0.3" : "1";
    prevBtn.style.cursor = currentPage === 0 ? "not-allowed" : "pointer";
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages - 1;
    nextBtn.style.opacity = currentPage >= totalPages - 1 ? "0.3" : "1";
    nextBtn.style.cursor = currentPage >= totalPages - 1 ? "not-allowed" : "pointer";
  }
}

function nextPage() {
  const categories = document.querySelectorAll(".category");
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  if (currentPage < totalPages - 1) {
    currentPage++;
    showCurrentPage();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    showCurrentPage();
  }
}

window.back = function () {
  location.href = `/HTML/event-frc.html?eventKey=${localStorage.getItem("currentEventKey")}`;
};

//stupid stupid stupid
document.addEventListener(
  "dblclick",
  function (event) {
    event.preventDefault();
  },
  { passive: false }
);

if (offlineBtn) {
  offlineBtn.addEventListener("click", toggleOfflineQuestions);
}

window.nextPage = nextPage;
window.prevPage = prevPage;
window.showPopup = showPopup;
window.toggleOfflineQuestions = toggleOfflineQuestions;
window.showOptions = showOptions;
export { popupError };
