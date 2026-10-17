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
let matchTimer = null;
let battleTimer = null;
let checkingMatch = false;
let myReadyStatus = false;
let battleIsActive = false;

readyBtn.hidden = true;

function cleanNickname(value) {
  return value.trim().replace(/\s+/g, " ");
}

function stopMatchChecking() {
  if (matchTimer) {
    clearInterval(matchTimer);
    matchTimer = null;
  }
}

function stopBattleChecking() {
  if (battleTimer) {
    clearInterval(battleTimer);
    battleTimer = null;
  }
}

async function workerRequest(data) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(MATCHMAKING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || result.message || "Request failed."
    );
  }

  return result;
}

async function findMatch() {
  const nickname = cleanNickname(nicknameInput.value);

  if (nickname.length < 3 || nickname.length > 16) {
    throw new Error("Your nickname must be 3–16 characters.");
  }

  currentNickname = nickname;

  return workerRequest({ nickname });
}

/* Retrieve the battle assigned to this player. */
async function checkForMatch() {
  if (!auth.currentUser || checkingMatch || currentBattleId) {
    return;
  }

  checkingMatch = true;

  try {
    const result = await workerRequest({
      action: "check_match"
    });

    if (result.status === "matched" && result.battleId) {
      currentBattleId = result.battleId;
      myReadyStatus = false;

      stopMatchChecking();

      readyBtn.hidden = false;
      readyBtn.disabled = false;

      message.textContent =
        "Opponent found: " +
        (result.opponentNickname || "Student") +
        ". Tap Ready when you're ready.";

      startBattleChecking();
    }
  } catch (error) {
    console.error("Match checking error:", error);
  } finally {
    checkingMatch = false;
  }
}

function startMatchChecking() {
  stopMatchChecking();

  checkForMatch();

  matchTimer = setInterval(() => {
    checkForMatch();
  }, 2000);
}

/* Check whether both players have pressed Ready. */
async function checkBattleStatus() {
  if (!currentBattleId || !auth.currentUser) {
    return;
  }

  try {
    const result = await workerRequest({
      action: "check_match"
    });

    if (
      result.status !== "matched" ||
      result.battleId !== currentBattleId
    ) {
      return;
    }

    const bothReady =
      result.playerOneReady === true &&
      result.playerTwoReady === true;

    if (
      result.battleStatus === "active" ||
      result.status === "active" ||
      bothReady
    ) {
      battleIsActive = true;
      readyBtn.disabled = true;

      message.textContent =
        "Both players are ready! The battle is active.";

      stopBattleChecking();
      return;
    }

    if (myReadyStatus) {
      message.textContent =
        "You're Ready! Waiting for your opponent...";
    }
  } catch (error) {
    console.error("Battle status error:", error);
  }
}

function startBattleChecking() {
  stopBattleChecking();

  checkBattleStatus();

  battleTimer = setInterval(() => {
    checkBattleStatus();
  }, 2000);
}

/* Sign-in and player presence. */
onAuthStateChanged(auth, async (user) => {
  stopMatchChecking();
  stopBattleChecking();

  currentBattleId = null;
  myReadyStatus = false;
  battleIsActive = false;

  readyBtn.hidden = true;
  readyBtn.disabled = false;

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
    const snapshot = await get(playerRef);

    const playerData = snapshot.exists()
      ? snapshot.val()
      : {};

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

/* Save nickname. */
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
    await update(ref(database, "players/" + user.uid), {
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

/* Show other online players. */
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

/* Find an opponent. */
randomBtn.addEventListener("click", async () => {
  randomBtn.disabled = true;

  stopMatchChecking();
  stopBattleChecking();

  currentBattleId = null;
  myReadyStatus = false;
  battleIsActive = false;

  readyBtn.hidden = true;
  readyBtn.disabled = false;

  message.textContent = "Finding an opponent...";

  try {
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

    if (result.status === "matched" && result.battleId) {
      currentBattleId = result.battleId;

      readyBtn.hidden = false;

      message.textContent =
        "Opponent found: " +
        (result.opponentNickname || "Student") +
        ". Tap Ready when you're ready.";

      startBattleChecking();
    } else if (result.status === "waiting") {
      message.textContent =
        "You're in the queue! Looking for your match...";

      startMatchChecking();
    } else {
      message.textContent =
        result.message ||
        "Matchmaking returned an unexpected response.";
    }
  } catch (error) {
    console.error("Matchmaking error:", error);

    message.textContent =
      error.message || "Matchmaking failed. Please try again.";
  } finally {
    randomBtn.disabled = false;
  }
});

/* Return home. */
homeBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

/* Mark this player Ready. */
readyBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    message.textContent = "Please sign in first.";
    return;
  }

  if (!currentBattleId) {
    message.textContent =
      "No battle found. Find an opponent first.";
    return;
  }

  readyBtn.disabled = true;
  message.textContent = "Updating your Ready status...";

  try {
    const result = await workerRequest({
      action: "ready",
      battleId: currentBattleId
    });

    myReadyStatus = true;

    if (
      result.status === "active" ||
      (
        result.playerOneReady === true &&
        result.playerTwoReady === true
      )
    ) {
      battleIsActive = true;

      message.textContent =
        "Both players are ready! The battle is active.";

      stopBattleChecking();
    } else {
      message.textContent =
        "You're Ready! Waiting for your opponent...";

      startBattleChecking();
    }
  } catch (error) {
    console.error("Ready action error:", error);

    message.textContent =
      error.message || "Could not update Ready status.";

    readyBtn.disabled = false;
  }
});
