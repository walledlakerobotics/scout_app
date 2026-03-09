const eventTitle = document.getElementById("eventNameHeader");

const eventKey = localStorage.getItem("currentEventKey") || null;
const eventDetails = JSON.parse(localStorage.getItem(`eventCache_${eventKey}`))?.eventDetails;

const URLParams = new URLSearchParams(window.location.search);
const inspectType = URLParams.get("type") || "thing";
const inspectKey = URLParams.get("key") || "?";

if (!eventKey) {
  location.href = "/HTML/index.html?msg=Yeahhh%20idk%20either";
}

//OK.

document.addEventListener("DOMContentLoaded", () => {
  eventTitle.textContent = `${eventDetails.year} ${eventDetails.district?.abbreviation?.toUpperCase() || eventDetails.short_name} ${eventDetails.short_name} Event`; //.textContent = `${inspectType} ${inspectKey}`;
});
