import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

// Reuse the Firebase app if the existing site has already initialised it.
const app = getApps()[0];

const message = document.getElementById("message");
const randomBtn = document.getElementById("randomBtn");
const playersBtn = document.getElementById("playersBtn");
const feed = document.getElementById("feed");
const leaderboard = document.getElementById("leaderboard");

let auth;
let database;

if (!app) {
  message.textContent =
    "Firebase setup is incomplete. Please check the existing app configuration.";

  randomBtn.disabled = true;
  playersBtn.disabled = true;
} else {
  auth = getAuth(app);
  database = getDatabase(app);

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      message.textContent =
        "Please sign in to your account before entering Quiz Battle.";

      randomBtn.disabled = true;
      playersBtn.disabled = true;
      return;
    }

    message.textContent =
      "You're signed in! The secure multiplayer system still needs to be connected.";

    randomBtn.disabled = false;
    playersBtn.disabled = false;
  });
}

randomBtn.addEventListener("click", () => {
  message.textContent =
    "Random matchmaking is not connected yet. Please wait for the multiplayer setup.";
});

playersBtn.addEventListener("click", () => {
  message.textContent =
    "The online players list will appear when player presence is configured.";
});

document.getElementById("homeBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});
