import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// ========================================
// FIREBASE CONFIGURATION
// ========================================

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

const WORKER_URL =
  "https://ptmoetdipwcdexdbtvrq.supabase.co/functions/v1/rapid-worker";

// ========================================
// INITIALIZE FIREBASE
// ========================================

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ========================================
// PAGE ELEMENTS
// ========================================

const $ = (id) => document.getElementById(id);

const questionForm = $("questionForm");
const questionList = $("questionList");
const questionListStatus = $("questionListStatus");
const saveBtn = $("saveBtn");

let questions = [];
let busy = false;
let editingQuestion = false;

// ========================================
// STATUS MESSAGES
// ========================================

function setStatus(message, type = "info") {
  const status = $("status");

  if (!status) return;

  status.textContent = message;
  status.dataset.type = type;
}

// ========================================
// WORKER REQUEST
// ========================================

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
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Request failed (${response.status}).`
    );
  }

  return result;
}

// ========================================
// NORMALIZE DATABASE QUESTIONS
// ========================================

function normalizeQuestion(item) {
  return {
    id: item.id,
    subject: item.subject || "Mathematics",
    question: item.question || "",

    optionA: item.option_a ?? item.options?.A ?? "",
    optionB: item.option_b ?? item.options?.B ?? "",
    optionC: item.option_c ?? item.options?.C ?? "",
    optionD: item.option_d ?? item.options?.D ?? "",

    correctAnswer:
      item.correct_answer || item.correctAnswer || "A",

    explanation: item.explanation || "",
    isActive: item.is_active !== false
  };
}

// ========================================
// UPDATE COUNTS
// ========================================

function updateCounts() {
  const activeCount = questions.filter(
    (question) => question.isActive
  ).length;

  if ($("activeCount")) {
    $("activeCount").textContent = activeCount;
  }

  if ($("listedCount")) {
    $("listedCount").textContent = questions.length;
  }
}

// ========================================
// RESET FORM
// ========================================

function resetForm() {
  questionForm.reset();

  $("questionId").value = "";

  $("formTitle").textContent = "Add a Question";
  saveBtn.textContent = "Add Question";

  if ($("cancelEditBtn")) {
    $("cancelEditBtn").hidden = true;
  }

  editingQuestion = false;

  setStatus("Ready to add a question.");
}

// ========================================
// FILL FORM FOR EDITING
// ========================================

function fillForm(item) {
  $("questionId").value = item.id;
  $("subject").value = item.subject;
  $("question").value = item.question;

  $("optionA").value = item.optionA;
  $("optionB").value = item.optionB;
  $("optionC").value = item.optionC;
  $("optionD").value = item.optionD;

  $("correctAnswer").value = item.correctAnswer;
  $("explanation").value = item.explanation;

  $("formTitle").textContent = "Edit Question";
  saveBtn.textContent = "Save Changes";

  if ($("cancelEditBtn")) {
    $("cancelEditBtn").hidden = false;
  }

  editingQuestion = true;

  setStatus(`Editing question #${item.id}.`);

  questionForm.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ========================================
// RENDER QUESTION LIST
// ========================================

function renderQuestions() {
  if (!questionList) return;

  const subjectFilter = $("filterSubject")?.value || "all";

  const searchTerm = (
    $("searchQuestions")?.value || ""
  ).trim().toLowerCase();

  const filtered = questions.filter((item) => {
    const matchesSubject =
      subjectFilter === "all" ||
      item.subject === subjectFilter;

    const searchableText = [
      item.subject,
      item.question,
      item.optionA,
      item.optionB,
      item.optionC,
      item.optionD
    ].join(" ").toLowerCase();

    return (
      matchesSubject &&
      searchableText.includes(searchTerm)
    );
  });

  questionList.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("p");

    empty.textContent = questions.length
      ? "No questions match your search."
      : "No questions have been loaded.";

    questionList.appendChild(empty);

    updateCounts();
    return;
  }

  filtered.forEach((item) => {
    const card = document.createElement("article");

    card.className = "question-card";

    const heading = document.createElement("h3");
    heading.textContent =
      `#${item.id} · ${item.subject}`;

    const status = document.createElement("p");
    status.textContent = item.isActive
      ? "Status: Active"
      : "Status: Inactive";

    const questionText = document.createElement("p");
    questionText.textContent = item.question;

    const optionsList = document.createElement("ol");
    optionsList.type = "A";

    [
      item.optionA,
      item.optionB,
      item.optionC,
      item.optionD
    ].forEach((option) => {
      const li = document.createElement("li");
      li.textContent = option;
      optionsList.appendChild(li);
    });

    const answer = document.createElement("p");
    answer.textContent =
      `Correct answer: ${item.correctAnswer}`;

    const explanation = document.createElement("p");
    explanation.textContent =
      `Explanation: ${item.explanation || "None provided"}`;

    const actions = document.createElement("div");
    actions.className = "question-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
      fillForm(item);
    });

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.textContent = item.isActive
      ? "Deactivate"
      : "Reactivate";

    toggleButton.addEventListener("click", async () => {
      await toggleQuestion(item);
    });

    actions.append(editButton, toggleButton);

    card.append(
      heading,
      status,
      questionText,
      optionsList,
      answer,
      explanation,
      actions
    );

    questionList.appendChild(card);
  });

  updateCounts();
}

// ========================================
// LOAD QUESTIONS
// ========================================

async function loadQuestions(force = false) {
  if (busy && !force) return;

  const previousBusy = busy;
  busy = true;

  if ($("refreshBtn")) {
    $("refreshBtn").disabled = true;
  }

  questionListStatus.textContent = "Loading questions...";

  try {
    const result = await workerRequest({
      action: "admin_list_questions"
    });

    const items = result.questions || result.data || [];

    questions = items.map(normalizeQuestion);

    renderQuestions();

    questionListStatus.textContent =
      `Loaded ${questions.length} questions.`;

    setStatus("Question bank loaded successfully.", "success");

  } catch (error) {
    console.error("Load questions error:", error);

    questionListStatus.textContent =
      `Could not load questions: ${error.message}`;

    setStatus(
      `Could not load questions: ${error.message}`,
      "error"
    );

  } finally {
    busy = previousBusy;

    if ($("refreshBtn")) {
      $("refreshBtn").disabled = previousBusy;
    }
  }
}

// ========================================
// COLLECT FORM DATA
// IMPORTANT: FIELD NAMES MATCH THE WORKER
// ========================================

function collectForm() {
  return {
    subject: $("subject").value.trim(),
    question: $("question").value.trim(),

    option_a: $("optionA").value.trim(),
    option_b: $("optionB").value.trim(),
    option_c: $("optionC").value.trim(),
    option_d: $("optionD").value.trim(),

    correct_answer: $("correctAnswer").value,
    explanation: $("explanation").value.trim()
  };
}

// ========================================
// ADD OR UPDATE QUESTION
// ========================================

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (busy) return;

  const questionId = $("questionId").value.trim();
  const data = collectForm();

  const requiredFields = [
    data.subject,
    data.question,
    data.option_a,
    data.option_b,
    data.option_c,
    data.option_d
  ];

  if (requiredFields.some((value) => !value)) {
    setStatus(
      "Please complete the subject, question and all four options.",
      "error"
    );
    return;
  }

  if (!["A", "B", "C", "D"].includes(data.correct_answer)) {
    setStatus("Choose a valid correct answer.", "error");
    return;
  }

  busy = true;
  saveBtn.disabled = true;

  if ($("refreshBtn")) {
    $("refreshBtn").disabled = true;
  }

  try {
    let result;

    if (questionId) {
      result = await workerRequest({
        action: "admin_update_question",
        id: questionId,
        ...data
      });
    } else {
      result = await workerRequest({
        action: "admin_add_question",
        ...data
      });
    }

    if (!result.success || !result.question) {
      throw new Error(
        "The server did not confirm the saved question."
      );
    }

    // Update the local list using the question returned
    // directly by the database.
    const savedQuestion = normalizeQuestion(result.question);

    const existingIndex = questions.findIndex(
      (item) => String(item.id) === String(savedQuestion.id)
    );

    if (existingIndex >= 0) {
      questions[existingIndex] = savedQuestion;
    } else {
      questions.unshift(savedQuestion);
    }

    resetForm();
    renderQuestions();

    setStatus(
      questionId
        ? `Question #${savedQuestion.id} updated. Refreshing the database list...`
        : `Question #${savedQuestion.id} added. Refreshing the database list...`,
      "success"
    );

    // Release the save lock before refreshing.
    busy = false;

    await loadQuestions();

  } catch (error) {
    console.error("Save question error:", error);

    setStatus(
      `Could not save question: ${error.message}`,
      "error"
    );

  } finally {
    busy = false;
    saveBtn.disabled = false;

    if ($("refreshBtn")) {
      $("refreshBtn").disabled = false;
    }
  }
});

// ========================================
// DEACTIVATE OR REACTIVATE QUESTION
// ========================================

async function toggleQuestion(item) {
  if (busy) return;

  busy = true;

  try {
    const result = await workerRequest({
      action: "admin_update_question",
      id: item.id,
      is_active: !item.isActive
    });

    if (!result.success || !result.question) {
      throw new Error("The server did not confirm the status change.");
    }

    const updated = normalizeQuestion(result.question);

    const index = questions.findIndex(
      (question) => String(question.id) === String(updated.id)
    );

    if (index !== -1) {
      questions[index] = updated;
    }

    renderQuestions();

    setStatus(
      updated.isActive
        ? "Question reactivated successfully."
        : "Question deactivated successfully.",
      "success"
    );

  } catch (error) {
    console.error("Question status error:", error);

    setStatus(
      `Could not change question status: ${error.message}`,
      "error"
    );

  } finally {
    busy = false;
  }
}

// ========================================
// SIGN IN
// ========================================

if ($("signInBtn")) {
  $("signInBtn").addEventListener("click", async () => {
    try {
      setStatus("Opening Google sign-in...");

      await signInWithPopup(auth, provider);

    } catch (error) {
      console.error("Sign-in error:", error);

      setStatus(
        `Sign-in failed: ${error.message}`,
        "error"
      );
    }
  });
}

// ========================================
// SIGN OUT
// ========================================

if ($("signOutBtn")) {
  $("signOutBtn").addEventListener("click", async () => {
    try {
      await signOut(auth);

      questions = [];
      questionList.replaceChildren();

      resetForm();

      setStatus("You have signed out.");

    } catch (error) {
      setStatus(`Sign-out failed: ${error.message}`, "error");
    }
  });
}

// ========================================
// CANCEL EDITING
// ========================================

if ($("cancelEditBtn")) {
  $("cancelEditBtn").addEventListener("click", () => {
    resetForm();
  });
}

// ========================================
// REFRESH BUTTON
// ========================================

if ($("refreshBtn")) {
  $("refreshBtn").addEventListener("click", () => {
    loadQuestions();
  });
}

// ========================================
// FILTERS
// ========================================

if ($("filterSubject")) {
  $("filterSubject").addEventListener("change", renderQuestions);
}

if ($("searchQuestions")) {
  $("searchQuestions").addEventListener("input", renderQuestions);
}

// ========================================
// AUTHENTICATION STATE
// ========================================

onAuthStateChanged(auth, async (user) => {
  const signInBtn = $("signInBtn");
  const signOutBtn = $("signOutBtn");
  const adminPanel = $("adminPanel");
  const authStatus = $("authStatus");

  if (!user) {
    if (authStatus) {
      authStatus.textContent = "Not signed in.";
    }

    if (signInBtn) signInBtn.hidden = false;
    if (signOutBtn) signOutBtn.hidden = true;
    if (adminPanel) adminPanel.hidden = true;

    questions = [];
    questionList.replaceChildren();

    questionListStatus.textContent =
      "Sign in with your authorised admin account to load questions.";

    return;
  }

  if (authStatus) {
    authStatus.textContent =
      `Signed in as ${user.email || "Google account"}.`;
  }

  if (signInBtn) signInBtn.hidden = true;
  if (signOutBtn) signOutBtn.hidden = false;

  // The worker remains responsible for checking the admin UID.
  if (adminPanel) adminPanel.hidden = false;

  await loadQuestions();
});

// ========================================
// INITIAL STATE
// ========================================

resetForm();

if ($("signInBtn")) $("signInBtn").hidden = false;
if ($("signOutBtn")) $("signOutBtn").hidden = true;
if ($("adminPanel")) $("adminPanel").hidden = true;
