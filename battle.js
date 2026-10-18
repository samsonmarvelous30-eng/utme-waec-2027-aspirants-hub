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

const WORKER_URL =
  "https://ptmoetdipwcdexdbtvrq.supabase.co/functions/v1/rapid-worker";

const $ = id => document.getElementById(id);

const message = $("message");
const randomBtn = $("randomBtn");
const playersBtn = $("playersBtn");
const homeBtn = $("homeBtn");
const nicknameInput = $("nickname");
const saveNicknameBtn = $("saveNicknameBtn");
const nicknameMessage = $("nicknameMessage");
const readyBtn = $("readyBtn");

const lobbyScreen = $("lobbyScreen");
const countdownScreen = $("countdownScreen");
const countdownNumber = $("countdownNumber");
const battleScreen = $("battleScreen");
const resultScreen = $("resultScreen");

const myName = $("myName");
const myScore = $("myScore");
const opponentName = $("opponentName");
const opponentScore = $("opponentScore");
const timer = $("timer");
const progressBar = $("progressBar");
const questionNumber = $("questionNumber");
const questionText = $("questionText");
const answerOptions = $("answerOptions");
const answerMessage = $("answerMessage");
const nextQuestionBtn = $("nextQuestionBtn");

const resultTitle = $("resultTitle");
const resultMessage = $("resultMessage");
const resultMyName = $("resultMyName");
const resultMyScore = $("resultMyScore");
const resultOpponentName = $("resultOpponentName");
const resultOpponentScore = $("resultOpponentScore");
const playAgainBtn = $("playAgainBtn");
const resultHomeBtn = $("resultHomeBtn");

let currentBattleId = null;
let currentNickname = "Student";
let opponentNickname = "Opponent";
let myUid = null;

let matchTimer = null;
let battleTimer = null;
let questionTimer = null;
let resultPollTimer = null;

let myReadyStatus = false;
let questions = [];
let questionIndex = 0;
let myScoreValue = 0;
let opponentScoreValue = 0;
let answered = false;
let answerPending = false;
let questionSeconds = 20;

let battleStartPromise = null;
let startedBattleId = null;
let finishingBattle = false;
let resultsScreenShown = false;

function cleanNickname(value) {
  return value.trim().replace(/\s+/g, " ");
}

function setMessage(text) {
  if (message) message.textContent = text;
}

function stopTimer(name) {
  if (name === "match") {
    clearInterval(matchTimer);
    matchTimer = null;
  }

  if (name === "battle") {
    clearInterval(battleTimer);
    battleTimer = null;
  }

  if (name === "question") {
    clearInterval(questionTimer);
    questionTimer = null;
  }

  if (name === "results") {
    clearInterval(resultPollTimer);
    resultPollTimer = null;
  }
}

function showScreen(screen) {
  [
    lobbyScreen,
    countdownScreen,
    battleScreen,
    resultScreen
  ].filter(Boolean).forEach(element => {
    element.hidden = element !== screen;
  });
}

async function workerRequest(data) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Request failed.");
  }

  return result;
}

function resetBattleState() {
  stopTimer("question");
  stopTimer("results");
  stopTimer("battle");

  currentBattleId = null;
  myReadyStatus = false;
  questions = [];
  questionIndex = 0;
  myScoreValue = 0;
  opponentScoreValue = 0;
  answered = false;
  answerPending = false;
  startedBattleId = null;
  battleStartPromise = null;
  finishingBattle = false;
  resultsScreenShown = false;
}

async function checkForMatch() {
  if (!auth.currentUser || currentBattleId) return;

  try {
    const result = await workerRequest({
      action: "check_match"
    });

    if (result.status === "matched" && result.battleId) {
      currentBattleId = result.battleId;
      opponentNickname = result.opponentNickname || "Opponent";

      stopTimer("match");

      if (readyBtn) {
        readyBtn.hidden = false;
        readyBtn.disabled = false;
      }

      setMessage(`Opponent found: ${opponentNickname}. Tap Ready!`);

      startBattleChecking();
    }
  } catch (error) {
    console.error("Match check error:", error);
  }
}

function startMatchChecking() {
  stopTimer("match");
  checkForMatch();
  matchTimer = setInterval(checkForMatch, 2000);
}

async function checkBattleStatus() {
  if (!currentBattleId || !auth.currentUser) return;

  if (startedBattleId === currentBattleId) {
    stopTimer("battle");
    return;
  }

  try {
    const result = await workerRequest({
      action: "check_match"
    });

    if (result.battleId !== currentBattleId) return;

    const bothReady =
      result.playerOneReady === true &&
      result.playerTwoReady === true;

    if (
      result.battleStatus === "active" ||
      result.status === "active" ||
      bothReady
    ) {
      stopTimer("battle");

      if (readyBtn) readyBtn.disabled = true;

      setMessage("Both players are ready!");

      await startBattle();
      return;
    }

    if (myReadyStatus) {
      setMessage("Ready! Waiting for your opponent...");
    }
  } catch (error) {
    console.error("Battle status error:", error);
  }
}

function startBattleChecking() {
  stopTimer("battle");
  checkBattleStatus();
  battleTimer = setInterval(checkBattleStatus, 2000);
}

async function startBattle() {
  if (!currentBattleId || !auth.currentUser) return;

  if (startedBattleId === currentBattleId) return;

  if (battleStartPromise) return battleStartPromise;

  const battleId = currentBattleId;

  battleStartPromise = (async () => {
    try {
      stopTimer("battle");

      const started = await workerRequest({
        action: "start_battle",
        battleId,
        nickname: currentNickname
      });

      if (!started || !started.questionCount) {
        throw new Error("Could not start this battle.");
      }

      if (started.status === "completed") {
        throw new Error("This battle has already been completed.");
      }

      const response = await workerRequest({
        action: "get_battle_questions",
        battleId
      });

      if (response.status === "completed") {
        throw new Error("This battle has already been completed.");
      }

      const loadedQuestions = response.questions || [];

      if (loadedQuestions.length !== 20) {
        throw new Error(
          "This battle needs exactly 20 questions."
        );
      }

      if (currentBattleId !== battleId) return;

      questions = loadedQuestions;
      questionIndex = 0;
      myScoreValue = 0;
      opponentScoreValue = 0;
      answered = false;
      answerPending = false;
      finishingBattle = false;
      resultsScreenShown = false;

      if (myName) myName.textContent = currentNickname;
      if (opponentName) {
        opponentName.textContent = opponentNickname;
      }

      if (myScore) myScore.textContent = "0";
      if (opponentScore) opponentScore.textContent = "0";

      startedBattleId = battleId;

      showScreen(countdownScreen);
      await countdown();

      if (currentBattleId !== battleId) return;

      showScreen(battleScreen);
      renderQuestion();
      startResultsPolling();
    } catch (error) {
      console.error("Start battle error:", error);

      setMessage(error.message || "Could not start the battle.");

      startedBattleId = null;
      showScreen(lobbyScreen);
    } finally {
      battleStartPromise = null;
    }
  })();

  return battleStartPromise;
}

function countdown() {
  return new Promise(resolve => {
    let count = 3;

    if (countdownNumber) {
      countdownNumber.textContent = String(count);
    }

    const interval = setInterval(() => {
      count--;

      if (count <= 0) {
        clearInterval(interval);

        if (countdownNumber) {
          countdownNumber.textContent = "GO!";
        }

        setTimeout(resolve, 600);
      } else if (countdownNumber) {
        countdownNumber.textContent = String(count);
      }
    }, 1000);
  });
}

function renderQuestion() {
  stopTimer("question");

  if (questionIndex >= questions.length) {
    finishBattle();
    return;
  }

  const question = questions[questionIndex];

  answered = false;
  answerPending = false;
  questionSeconds = 20;

  if (questionNumber) {
    questionNumber.textContent =
      `Question ${questionIndex + 1} of ${questions.length}`;
  }

  if (questionText) {
    questionText.textContent = question.question;
  }

  if (timer) timer.textContent = `${questionSeconds}s`;

  if (progressBar) {
    progressBar.style.width =
      `${(questionIndex / questions.length) * 100}%`;
  }

  if (answerMessage) answerMessage.textContent = "";
  if (nextQuestionBtn) nextQuestionBtn.hidden = true;

  if (answerOptions) {
    answerOptions.replaceChildren();

    question.options.forEach(option => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "answer-option";
      button.textContent = `${option.key}. ${option.text}`;

      button.addEventListener("click", () => {
        submitAnswer(option.key, button);
      });

      answerOptions.appendChild(button);
    });
  }

  questionTimer = setInterval(() => {
    questionSeconds--;

    if (timer) {
      timer.textContent = `${questionSeconds}s`;
    }

    if (questionSeconds <= 0) {
      stopTimer("question");

      if (!answered && !answerPending) {
        submitAnswer("TIMEOUT", null);
      }
    }
  }, 1000);
}

async function submitAnswer(answer, selectedButton) {
  if (answered || answerPending || finishingBattle) return;

  answerPending = true;
  stopTimer("question");

  if (answerOptions) {
    answerOptions.querySelectorAll("button").forEach(button => {
      button.disabled = true;
    });
  }

  try {
    const question = questions[questionIndex];

    const result = await workerRequest({
      action: "submit_answer",
      battleId: currentBattleId,
      questionId: question.id,
      answer
    });

    if (!result.accepted) {
      throw new Error("The answer was not accepted.");
    }

    myScoreValue = Number(result.score || 0);

    if (myScore) {
      myScore.textContent = String(myScoreValue);
    }

    if (answerMessage) {
      if (answer === "TIMEOUT") {
        answerMessage.textContent = "Time's up!";
      } else if (result.correct) {
        answerMessage.textContent = "Correct!";
      } else {
        answerMessage.textContent = "Not quite!";
      }
    }

    if (selectedButton) {
      selectedButton.classList.add("selected-answer");
    }

    answered = true;
    answerPending = false;

    if (nextQuestionBtn) {
      nextQuestionBtn.hidden = false;
    }

    if (progressBar) {
      progressBar.style.width =
        `${((questionIndex + 1) / questions.length) * 100}%`;
    }
  } catch (error) {
    console.error("Answer submission error:", error);

    answerPending = false;

    if (answerMessage) {
      answerMessage.textContent =
        error.message || "Could not submit answer. Try again.";
    }

    // A duplicate-answer response means the server already
    // recorded this question. Do not permit another submission.
    if (
      error.message &&
      error.message.toLowerCase().includes("already answered")
    ) {
      answered = true;

      if (nextQuestionBtn) {
        nextQuestionBtn.hidden = false;
      }

      return;
    }

    if (answerOptions) {
      answerOptions.querySelectorAll("button").forEach(button => {
        button.disabled = false;
      });
    }

    // Allow another attempt after a temporary network failure.
    questionTimer = setInterval(() => {
      questionSeconds--;

      if (timer) timer.textContent = `${questionSeconds}s`;

      if (questionSeconds <= 0) {
        stopTimer("question");

        if (!answered && !answerPending) {
          submitAnswer("TIMEOUT", null);
        }
      }
    }, 1000);
  }
}

function nextQuestion() {
  if (!answered || answerPending) return;

  questionIndex++;
  renderQuestion();
}

function startResultsPolling() {
  stopTimer("results");

  updateScores();

  resultPollTimer = setInterval(updateScores, 2500);
}

async function updateScores() {
  if (!currentBattleId) return;

  try {
    const result = await workerRequest({
      action: "get_battle_results",
      battleId: currentBattleId
    });

    const results = result.results || [];

    const mine = results.find(item => item.user_id === myUid);
    const opponent = results.find(item => item.user_id !== myUid);

    if (mine) {
      myScoreValue = Number(mine.score || 0);

      if (myScore) {
        myScore.textContent = String(myScoreValue);
      }
    }

    if (opponent) {
      opponentScoreValue = Number(opponent.score || 0);

      if (opponentScore) {
        opponentScore.textContent = String(opponentScoreValue);
      }

      if (opponentName && opponent.nickname) {
        opponentNickname = opponent.nickname;
        opponentName.textContent = opponent.nickname;
      }
    }

    // If both players finished, update the final result screen.
    if (
      result.sessionStatus === "completed" &&
      result.bothFinished &&
      resultsScreenShown
    ) {
      displayFinalResult();
    }
  } catch (error) {
    console.error("Score refresh error:", error);
  }
}

async function finishBattle() {
  if (finishingBattle || resultsScreenShown) return;

  finishingBattle = true;

  stopTimer("question");
  stopTimer("results");

  if (answerOptions) {
    answerOptions.querySelectorAll("button").forEach(button => {
      button.disabled = true;
    });
  }

  try {
    const result = await workerRequest({
      action: "finish_battle",
      battleId: currentBattleId
    });

    const results = result.results || [];

    const mine = results.find(item => item.user_id === myUid);
    const opponent = results.find(item => item.user_id !== myUid);

    if (mine) {
      myScoreValue = Number(mine.score || 0);
    }

    if (opponent) {
      opponentScoreValue = Number(opponent.score || 0);
      opponentNickname = opponent.nickname || opponentNickname;
    }

    if (result.status === "completed") {
      resultsScreenShown = true;
      displayFinalResult();
      return;
    }

    showScreen(resultScreen);

    if (resultTitle) {
      resultTitle.textContent = "You finished!";
    }

    if (resultMessage) {
      resultMessage.textContent =
        "Your score has been saved. Waiting for your opponent to finish.";
    }

    if (resultMyName) {
      resultMyName.textContent = currentNickname;
    }

    if (resultMyScore) {
      resultMyScore.textContent = String(myScoreValue);
    }

    if (resultOpponentName) {
      resultOpponentName.textContent = opponentNickname;
    }

    if (resultOpponentScore) {
      resultOpponentScore.textContent = String(opponentScoreValue);
    }

    resultsScreenShown = true;

    // Continue checking until the server confirms completion.
    resultPollTimer = setInterval(async () => {
      try {
        const status = await workerRequest({
          action: "get_battle_results",
          battleId: currentBattleId
        });

        const mineNow = (status.results || []).find(
          item => item.user_id === myUid
        );

        const opponentNow = (status.results || []).find(
          item => item.user_id !== myUid
        );

        if (mineNow) {
          myScoreValue = Number(mineNow.score || 0);
        }

        if (opponentNow) {
          opponentScoreValue = Number(opponentNow.score || 0);
          opponentNickname = opponentNow.nickname || opponentNickname;
        }

        if (status.sessionStatus === "completed" && status.bothFinished) {
          stopTimer("results");
          displayFinalResult();
        } else if (resultMessage) {
          resultMessage.textContent =
            "Your score is saved. Waiting for your opponent to finish.";
        }
      } catch (error) {
        console.error("Final result polling error:", error);
      }
    }, 2500);
  } catch (error) {
    console.error("Finish battle error:", error);

    finishingBattle = false;

    if (resultMessage) {
      resultMessage.textContent =
        error.message || "Could not finish the battle. Please retry.";
    }

    showScreen(battleScreen);
  }
}

function displayFinalResult() {
  stopTimer("results");
  stopTimer("question");

  showScreen(resultScreen);

  if (resultMyName) {
    resultMyName.textContent = currentNickname;
  }

  if (resultMyScore) {
    resultMyScore.textContent = String(myScoreValue);
  }

  if (resultOpponentName) {
    resultOpponentName.textContent = opponentNickname;
  }

  if (resultOpponentScore) {
    resultOpponentScore.textContent = String(opponentScoreValue);
  }

  if (myScoreValue > opponentScoreValue) {
    if (resultTitle) resultTitle.textContent = "You won!";

    if (resultMessage) {
      resultMessage.textContent = "Great job! You won this battle.";
    }
  } else if (myScoreValue < opponentScoreValue) {
    if (resultTitle) resultTitle.textContent = "Battle complete";

    if (resultMessage) {
      resultMessage.textContent =
        "Good effort! Try again to improve your score.";
    }
  } else {
    if (resultTitle) resultTitle.textContent = "It's a draw!";

    if (resultMessage) {
      resultMessage.textContent =
        "You both finished with the same score.";
    }
  }
}
// --------------------------------------------------
// AUTHENTICATION AND ONLINE PRESENCE
// --------------------------------------------------
onAuthStateChanged(auth, async user => {
  stopTimer("match");
  stopTimer("battle");

  resetBattleState();

  myUid = user?.uid || null;

  if (readyBtn) {
    readyBtn.hidden = true;
    readyBtn.disabled = false;
  }

  if (!user) {
    setMessage("Please sign in before entering Quiz Battle.");

    if (randomBtn) randomBtn.disabled = true;
    if (playersBtn) playersBtn.disabled = true;
    if (saveNicknameBtn) saveNicknameBtn.disabled = true;
    if (nicknameInput) nicknameInput.disabled = true;

    return;
  }

  if (randomBtn) randomBtn.disabled = false;
  if (playersBtn) playersBtn.disabled = false;
  if (saveNicknameBtn) saveNicknameBtn.disabled = false;
  if (nicknameInput) nicknameInput.disabled = false;

  try {
    const playerRef = ref(database, "players/" + user.uid);
    const snapshot = await get(playerRef);
    const playerData = snapshot.exists() ? snapshot.val() : {};

    currentNickname =
      playerData.nickname || user.displayName || "Student";

    if (nicknameInput) {
      nicknameInput.value = currentNickname;
    }

    await onDisconnect(playerRef).update({
      online: false,
      lastSeen: serverTimestamp()
    });

    await update(playerRef, {
      nickname: currentNickname,
      online: true,
      lastSeen: serverTimestamp()
    });

    setMessage("You're online and ready for Quiz Battle!");
  } catch (error) {
    console.error("Presence error:", error);
    setMessage("Connection error. Please try again.");
  }
});

// --------------------------------------------------
// SAVE NICKNAME
// --------------------------------------------------
if (saveNicknameBtn) {
  saveNicknameBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const nickname = cleanNickname(nicknameInput.value);

    if (nickname.length < 3 || nickname.length > 16) {
      if (nicknameMessage) {
        nicknameMessage.textContent =
          "Nickname must be 3–16 characters long.";
      }

      return;
    }

    saveNicknameBtn.disabled = true;

    try {
      await update(ref(database, "players/" + user.uid), {
        nickname,
        online: true,
        lastSeen: serverTimestamp()
      });

      currentNickname = nickname;

      if (nicknameMessage) {
        nicknameMessage.textContent = "Nickname saved!";
      }
    } catch (error) {
      if (nicknameMessage) {
        nicknameMessage.textContent =
          error.message || "Could not save nickname.";
      }
    } finally {
      saveNicknameBtn.disabled = false;
    }
  });
}

// --------------------------------------------------
// VIEW ONLINE PLAYERS
// --------------------------------------------------
if (playersBtn) {
  playersBtn.addEventListener("click", async () => {
    if (!auth.currentUser) return;

    playersBtn.disabled = true;

    try {
      const snapshot = await get(ref(database, "players"));
      const players = snapshot.exists() ? snapshot.val() : {};

      const onlinePlayers = Object.entries(players)
        .filter(([uid, player]) =>
          uid !== auth.currentUser.uid &&
          player?.online === true
        )
        .map(([, player]) => player.nickname || "Student");

      setMessage(
        onlinePlayers.length
          ? "Online players: " + onlinePlayers.join(", ")
          : "No other players are online yet."
      );
    } catch (error) {
      setMessage(error.message || "Could not load players.");
    } finally {
      playersBtn.disabled = false;
    }
  });
}

// --------------------------------------------------
// FIND OPPONENT
// --------------------------------------------------
if (randomBtn) {
  randomBtn.addEventListener("click", async () => {
    if (!auth.currentUser) {
      setMessage("Please sign in first.");
      return;
    }

    if (currentBattleId) {
      setMessage("You already have a battle in progress.");
      return;
    }

    randomBtn.disabled = true;
    setMessage("Finding an opponent...");

    try {
      const nickname = cleanNickname(nicknameInput.value);

      if (nickname.length < 3 || nickname.length > 16) {
        throw new Error("Nickname must be 3–16 characters.");
      }

      await update(ref(database, "players/" + auth.currentUser.uid), {
        nickname,
        online: true,
        lastSeen: serverTimestamp()
      });

      currentNickname = nickname;

      const result = await workerRequest({ nickname });

      if (result.status === "matched" && result.battleId) {
        currentBattleId = result.battleId;
        opponentNickname = result.opponentNickname || "Opponent";

        if (readyBtn) {
          readyBtn.hidden = false;
          readyBtn.disabled = false;
        }

        setMessage(`Opponent found: ${opponentNickname}. Tap Ready!`);
        startBattleChecking();
      } else if (result.status === "waiting") {
        setMessage("You're in the queue! Looking for your match...");
        startMatchChecking();
      } else {
        setMessage(result.message || "Could not find a match.");
      }
    } catch (error) {
      setMessage(error.message || "Matchmaking failed.");
    } finally {
      randomBtn.disabled = false;
    }
  });
}

// --------------------------------------------------
// READY
// --------------------------------------------------
if (readyBtn) {
  readyBtn.addEventListener("click", async () => {
    if (!currentBattleId) {
      setMessage("Find an opponent first.");
      return;
    }

    readyBtn.disabled = true;

    try {
      const result = await workerRequest({
        action: "ready",
        battleId: currentBattleId
      });

      myReadyStatus = true;

      if (
        result.status === "active" ||
        (result.playerOneReady && result.playerTwoReady)
      ) {
        await startBattle();
      } else {
        setMessage("You're Ready! Waiting for your opponent...");
        startBattleChecking();
      }
    } catch (error) {
      readyBtn.disabled = false;
      setMessage(error.message || "Could not mark Ready.");
    }
  });
}

// --------------------------------------------------
// QUESTION NAVIGATION
// --------------------------------------------------
if (nextQuestionBtn) {
  nextQuestionBtn.addEventListener("click", nextQuestion);
}

// --------------------------------------------------
// HOME AND REPLAY
// --------------------------------------------------
if (homeBtn) {
  homeBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

if (resultHomeBtn) {
  resultHomeBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

if (playAgainBtn) {
  playAgainBtn.addEventListener("click", () => {
    window.location.reload();
  });
}

showScreen(lobbyScreen);
