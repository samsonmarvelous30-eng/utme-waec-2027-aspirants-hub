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
  get,
  update,
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
  databaseURL:
    "https://utme-waec-aspirants-hub-default-rtdb.firebaseio.com/"
};

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const database = getDatabase(app);

const MATCHMAKING_URL =
  "https://ptmoetdipwcdexdbtvrq.supabase.co/functions/v1/rapid-worker";

const message = document.getElementById("message");
const randomBtn = document.getElementById("randomBtn");
const playersBtn = document.getElementById("playersBtn");
const homeBtn = document.getElementById("homeBtn");
const nicknameInput = document.getElementById("nickname");
const saveNicknameBtn = document.getElementById("saveNicknameBtn");
const nicknameMessage = document.getElementById("nicknameMessage");
const readyBtn = document.getElementById("readyBtn");

let currentBattleId = null;
let currentNickname = "Student";

function cleanNickname(value) {
  return value.trim().replace(/\s+/g, " ");
}

async function findMatch() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in first.");
  }

  const nickname = cleanNickname(nicknameInput.value);

  if (nickname.length < 3 || nickname.length > 16) {
    throw new Error("Your nickname must be 3–16 characters.");
  }

  // Make sure the saved nickname is current.
  currentNickname = nickname;

  const token = await user.getIdToken();

  const response = await fetch(MATCHMAKING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ nickname })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || result.message || "Matchmaking failed."
    );
  }

  return result;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    message.textContent =
      "Please sign in before entering Quiz Battle.";

    randomBtn.disabled = true;
    playersBtn.disabled = true;
    saveNicknameBtn.disabled = true;
    nicknameInput.disabled = true;
    return;
  }

  randomBtn.disabled = false;
  playersBtn.disabled = false;
  saveNicknameBtn.disabled = false;
  nicknameInput.disabled = false;

  const playerRef = ref(database, "players/" + user.uid);

  try {
    const existing = await get(playerRef);
    const playerData = existing.exists() ? existing.val() : {};

    currentNickname =
      playerData.nickname ||
      user.displayName ||
      "Student";

    nicknameInput.value = currentNickname;

    await onDisconnect(playerRef).update({
      online: false,
      lastSeen: serverTimestamp()
    });

    await update(playerRef, {
      online: true,
      lastSeen: serverTimestamp(),
      nickname: currentNickname
    });

    message.textContent =
      "You're online and ready for Quiz Battle!";
  } catch (error) {
    console.error("Presence error:", error);

    message.textContent =
      "Connection error: " +
      (error.code || error.message || "Please try again.");
  }
});

saveNicknameBtn.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    nicknameMessage.textContent = "Please sign in first.";
    return;
  }

  const nickname = cleanNickname(nicknameInput.value);

  if (nickname.length < 3 || nickname.length > 16) {
    nicknameMessage.textContent =
      "Your nickname must be 3–16 characters long.";
    return;
  }

  saveNicknameBtn.disabled = true;
  nicknameMessage.textContent = "Saving nickname...";

  try {
    const playerRef = ref(database, "players/" + user.uid);

    await update(playerRef, {
      nickname,
      online: true,
      lastSeen: serverTimestamp()
    });

    currentNickname = nickname;
    nicknameInput.value = nickname;

    nicknameMessage.textContent =
      "Nickname saved successfully!";
  } catch (error) {
    console.error("Nickname error:", error);

    nicknameMessage.textContent =
      "Could not save: " +
      (error.code || error.message || "Please try again.");
  } finally {
    saveNicknameBtn.disabled = false;
  }
});

playersBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    message.textContent = "Please sign in first.";
    return;
  }

  playersBtn.disabled = true;
  message.textContent = "Checking online players...";

  try {
    const snapshot = await get(ref(database, "players"));

    if (!snapshot.exists()) {
      message.textContent = "No online players found yet.";
      return;
    }

    const players = snapshot.val();

    const onlinePlayers = Object.entries(players)
      .filter(([uid, player]) =>
        uid !== auth.currentUser.uid &&
        player &&
        player.online === true
      )
      .map(([, player]) => player.nickname || "Student");

    message.textContent = onlinePlayers.length
      ? "Online players: " + onlinePlayers.join(", ")
      : "No other players are online yet. Invite a student to join!";
  } catch (error) {
    console.error("Players lookup error:", error);

    message.textContent =
      "Could not load players: " +
      (error.code || error.message || "Please try again.");
  } finally {
    playersBtn.disabled = false;
  }
});

randomBtn.addEventListener("click", async () => {
  randomBtn.disabled = true;
  message.textContent = "Finding an opponent...";

  try {
    // Save the nickname first, so Firebase and matchmaking agree.
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Please sign in first.");
    }

    const nickname = cleanNickname(nicknameInput.value);

    if (nickname.length < 3 || nickname.length > 16) {
      throw new Error("Your nickname must be 3–16 characters.");
    }

    await update(ref(database, "players/" + user.uid), {
      nickname,
      online: true,
      lastSeen: serverTimestamp()
    });

    currentNickname = nickname;

    const result = await findMatch();
if (result.status === "matched") {
  currentBattleId = result.battleId || null;

  message.textContent =
    "Opponent found: " +
    (result.opponentNickname || "Student") +
    ". Battle ID: " +
    (currentBattleId || "created");

  if (currentBattleId) {
    readyBtn.hidden = false;
  } else {
    message.textContent +=
      " A valid Battle ID is needed to continue.";
  }
    } else if (result.status === "waiting") {
      message.textContent =
        "You're in the queue! Waiting for another student to join.";
    } else {
      message.textContent =
        result.message || "Matchmaking returned an unexpected response.";
    }
  } catch (error) {
    console.error("Matchmaking error:", error);

    message.textContent =
      error.message || "Matchmaking failed. Please try again.";
  } finally {
    randomBtn.disabled = false;
  }
});

homeBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});
readyBtn.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    message.textContent = "Please sign in first.";
    return;
  }

  if (!currentBattleId) {
    message.textContent =
      "No active battle found. Find an opponent first.";
    return;
  }

  readyBtn.disabled = true;
  message.textContent = "Updating your Ready status...";

  try {
    const token = await user.getIdToken();

    const response = await fetch(MATCHMAKING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        action: "ready",
        battleId: currentBattleId
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error || "Could not update Ready status."
      );
    }

    message.textContent =
      "You're marked as Ready! Waiting for your opponent.";
  } catch (error) {
    console.error("Ready action error:", error);

    message.textContent =
      error.message || "Could not update Ready status.";

    readyBtn.disabled = false;
  }
});
