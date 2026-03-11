// ONCE PUBLISHED TO WEBSITE ALL CLOUDFLARE WORKERS MUST BE MOVED TO AN OFFICIAL ACCOUNT

import { questionDB } from "/JS/DB.js";
import { getDB } from "/JS/DB.js";

export async function TBA_GET(endpoint) {
  // fetch the blue alliance with cloudflare auth worker
  // note if TBA adds any sort of rate limiting this will probably need to be changed
  try {
    const response = await fetch(`https://tba-auth.bheitz780.workers.dev${endpoint}`);
    const data = await response.json();
    return data;
  } catch (err) {
    // network error? i think
    return false;
  }
}

export function isAdmin() {
  return localStorage.getItem("isAdmin") === "true";
}

export function getUserTeam() {
  const token = localStorage.getItem("scoutingAuthToken");
  //if (!token) return false;

  const dToken = atob(token);
  let team = "308";

  if (dToken.includes("7178")) {
    team = "7178";
  }

  return team;
}

export async function isActiveEvent() {
  // returns { isActive: boolean, event: currentevent/nextevent/null}

  let currentEvent = null;
  let nextEvent = null;

  try {
    const team = getUserTeam();
    const now = new Date();
    const devOverride = true;
    const events = await TBA_GET(`/team/frc${team}/events/${now.getUTCFullYear()}`);

    if (!events) return false;

    for (const details of events) {
      const start = new Date(details.start_date);
      const end = new Date(details.end_date);

      // active event in range
      if (devOverride || (now >= start && now <= end)) {
        currentEvent = details;
        break;
      }

      // soonest event
      if (start > now) {
        if (nextEvent === null || start < new Date(nextEvent.start_date)) {
          nextEvent = details;
        }
      }
    }
  } catch (error) {
    alert("Error fetching events:", error);
    console.error("Error fetching events:", error);
    return false;
  }

  if (currentEvent) {
    return {
      isActive: true,
      event: currentEvent,
    };
  }

  if (nextEvent) {
    return {
      isActive: false,
      event: nextEvent,
    };
  }

  // end of the season???
  return {
    isActive: false,
    event: null,
  };
}

export function retagResponses(untaggedResponses, questions) {
  if (!questions) {
    return null;
  }

  const retaggedResponses = {};

  for (const categoryId in untaggedResponses) {
    if (!questions[categoryId]) continue;

    retaggedResponses[categoryId] = {};

    const categoryQuestions = questions[categoryId];

    untaggedResponses[categoryId].forEach((value, index) => {
      if (categoryQuestions[index] && categoryQuestions[index].id) {
        const questionId = categoryQuestions[index].id;
        retaggedResponses[categoryId][questionId] = value;
      }
    });
  }

  return retaggedResponses;
}

export async function newEventCache(eventKey, questionsFetcher) {
  let [mData, eventDetails, questionsData, scoutedData] = await Promise.all([TBA_GET(`/event/${eventKey}/matches`), TBA_GET(`/event/${eventKey}`), questionsFetcher ? questionsFetcher() : questionDB("GET"), getDB(`/db?eventKey=${eventKey}`)]);

  if (mData && mData.length !== 0) {
    mData.sort((a, b) => {
      const matchTypeOrder = { qm: 1, ef: 2, qf: 3, sf: 4, f: 5 };
      if (matchTypeOrder[a.comp_level] !== matchTypeOrder[b.comp_level]) {
        return matchTypeOrder[a.comp_level] - matchTypeOrder[b.comp_level];
      }
      const aNum = a.comp_level === "sf" ? a.set_number : a.match_number;
      const bNum = b.comp_level === "sf" ? b.set_number : b.match_number;
      if (aNum === bNum) return a.match_number - b.match_number;
      return aNum - bNum;
    });
  }

  const lastUpdated = new Date().getTime();
  const cache = { mData, eventDetails, lastUpdated, questionsData, scoutedData: scoutedData.data };
  localStorage.setItem(`eventCache_${eventKey}`, JSON.stringify(cache));
  localStorage.setItem("currentEventKey", eventKey);
  return cache;
}

window.logout = () => {
  localStorage.removeItem("scoutingAuthToken");
  localStorage.removeItem("userProfile");
  window.location = "../HTML/login.html";
};
