const url = "https://rapid-scene-bf9b.bheitz780.workers.dev/verify"; // 'rapid scene' because im stupid

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
        // update token if new one is provided???
        if (data.token) {
          localStorage.setItem("scoutingAuthToken", data.token);
        }
      } else {
        //kick and let login.js do all the errors n stuff
        window.location = "../HTML/login.html";
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    }
  } else {
    window.location = "../HTML/login.html";
  }
}

checkAuth();
