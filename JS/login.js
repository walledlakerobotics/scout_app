const url = "https://rapid-scene-bf9b.bheitz780.workers.dev/verify";

const loginScreen = document.getElementById("loginScreen");
const codeInput = document.getElementById("codeInput");
const submitBtn = document.getElementById("submitBtn");
const errorMsg = document.getElementById("errMsg");

async function checkAuth() {
  const token = localStorage.getItem("scoutingAuthToken");
  if (token) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (data.success) {
        // update token if new one is provided
        if (data.token) {
          localStorage.setItem("scoutingAuthToken", data.token);
        }
        window.location = "../HTML/index.html?msg=Logged%20in%20successfully";
      } else {
        localStorage.removeItem("scoutingAuthToken");
        localStorage.removeItem("userProfile");
        showError("Invalid Token. Please re-enter access code.");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    }
  }
}

async function verify(code) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem("scoutingAuthToken", data.token); // Changed to localStorage
      localStorage.setItem("isAdmin", data.isAdmin ? "true" : "false");
      window.location = "../HTML/profiles.html";
      //done
    } else {
      console.log(data.valid);
      showError(data.message || "Error: Invalid code");
    }
  } catch (error) {
    showError("Connection Error. Please try again later.");
    console.error("Error:", error);
  }
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
  codeInput.value = "";
}

submitBtn.addEventListener("click", () => {
  const code = codeInput.value.trim();
  if (code) {
    errorMsg.classList.add("hidden");
    verify(code);
  }
});

codeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    submitBtn.click();
  }
});

checkAuth();
