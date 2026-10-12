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

// Existing Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9mgI_Atf0sxcDtQgF-hBLYPhEctELc6M",
  authDomain: "utme-waec-aspirants-hub.firebaseapp.com",
  projectId: "utme-waec-aspirants-hub",
  storageBucket: "utme-waec-aspirants-hub.firebasestorage.app",
  messagingSenderId: "483058761546",
  appId: "1:483058761546:web:ec6eaa3109eca1c941cbb3",
  databaseURL: "https://utme-waec-aspirants-hub-default-rtdb.firebaseio.com/"
};

// Reuse an existing app instance or initialise one
const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const database = getDatabase(app);

const message = document.getElementById("message");
const randomBtn = document.getElementById("randomBtn");
const playersBtn = document.getElementById("playersBtn");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    message.textContent =
      "Please sign in before entering Quiz Battle.";

    randomBtn.disabled = true;
    playersBtn.disabled = true;
    return;
  }

  message.textContent =
    "You're signed in! Firebase is connected. Multiplayer matchmaking is not enabled yet.";

  randomBtn.disabled = false;
  playersBtn.disabled = false;
});

randomBtn.addEventListener("click", () => {
  message.textContent =
    "Random matchmaking will be available when the secure battle system is ready.";
});

playersBtn.addEventListener("click", () => {
  message.textContent =
    "The online players list will appear after player presence is configured.";
});

document.getElementById("homeBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});
