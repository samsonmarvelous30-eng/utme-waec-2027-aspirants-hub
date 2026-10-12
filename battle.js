import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9mgI_Atf0sxcDtQgF-hBLYPhEctELc6M",
  authDomain: "utme-waec-aspirants-hub.firebaseapp.com",
  projectId: "utme-waec-aspirants-hub",
  storageBucket: "utme-waec-aspirants-hub.firebasestorage.app",
  messagingSenderId: "483058761546",
  appId: "1:483058761546:web:ec6eaa3109eca1c941cbb3",
  databaseURL: "https://utme-waec-aspirants-hub-default-rtdb.firebaseio.com/"
};

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const database = getDatabase(app);
const currentPlayer = () => auth.currentUser?.uid || null;
const message = document.getElementById("message");
const randomBtn = document.getElementById("randomBtn");
const playersBtn = document.getElementById("playersBtn");
const playerUid = currentPlayer();
console.log("Current battle player:", playerUid);
const homeBtn = document.getElementById("homeBtn");

let signedIn = false;

onAuthStateChanged(auth, (user) => {
  signedIn = Boolean(user);

  if (!signedIn) {
    message.textContent =
      "Please sign in before entering Quiz Battle.";

    randomBtn.disabled = true;
    playersBtn.disabled = true;
    return;
  }

  randomBtn.disabled = false;
  playersBtn.disabled = false;

  message.textContent =
    "You're signed in! Choose how you want to battle.";
});

randomBtn.addEventListener("click", () => {
  if (!signedIn) {
    message.textContent = "Please sign in first.";
    return;
  }

  message.textContent =
    "Random Match is not connected yet. Secure matchmaking setup is still required.";
});

playersBtn.addEventListener("click", () => {
  if (!signedIn) {
    message.textContent = "Please sign in first.";
    return;
  }

  const roomCode = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  message.textContent =
    "Your suggested room code is " + roomCode +
    ". This is only a preview; no room has been created or shared yet.";
});

homeBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});
// Quiz Battle player identity
onAuthStateChanged(auth, (user) => {
  if (!user) return;

  console.log("Battle player UID:", user.uid);
  console.log("Battle player name:", user.displayName || "Student");
});
