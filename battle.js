import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  get,
  onDisconnect,
  serverTimestamp
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

const message = document.getElementById("message");
const randomBtn = document.getElementById("randomBtn");
const playersBtn = document.getElementById("playersBtn");
const homeBtn = document.getElementById("homeBtn");

let signedIn = false;

onAuthStateChanged(auth, async (user) => {
  signedIn = Boolean(user);

  if (!user) {
    message.textContent = "Please sign in before entering Quiz Battle.";
    randomBtn.disabled = true;
    playersBtn.disabled = true;
    return;
  }

  randomBtn.disabled = false;
  playersBtn.disabled = false;

  const playerRef = ref(database, "players/" + user.uid);

  try {
    await onDisconnect(playerRef).set({
      online: false,
      lastSeen: serverTimestamp()
    });

    await set(playerRef, {
      online: true,
      lastSeen: serverTimestamp(),
      name: user.displayName || "Student"
    });

    message.textContent = "You're online and ready for Quiz Battle!";
  } catch (error) {
    console.error("Presence error:", error);
    message.textContent = "Presence error: " + (error.code || error.message);
  }
});

playersBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    message.textContent = "Please sign in first.";
    return;
  }

  message.textContent = "Checking online players...";

  try {
    const playersRef = ref(database, "players");
    const snapshot = await get(playersRef);

    if (!snapshot.exists()) {
      message.textContent = "No online players found yet. Invite a student to open Quiz Battle.";
      return;
    }

    const players = snapshot.val();
    const onlinePlayers = Object.entries(players)
      .filter(([uid, player]) => uid !== auth.currentUser.uid && player.online === true);

    if (onlinePlayers.length === 0) {
      message.textContent = "No other players are online yet. Invite a student to join!";
      return;
    }

    message.textContent = "Online players: " + onlinePlayers
      .map(([, player]) => player.name || "Student")
      .join(", ");
  } catch (error) {
    console.error("Players lookup error:", error);
    message.textContent = "Could not load players: " + (error.code || error.message);
  }
});

randomBtn.addEventListener("click", () => {
  if (!auth.currentUser) {
    message.textContent = "Please sign in first.";
    return;
  }

  message.textContent = "You're ready! Random matchmaking still needs to be connected.";
});

homeBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});
  
