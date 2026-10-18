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

const WORKER_URL =
  "https://ptmoetdipwcdexdbtvrq.supabase.co/functions/v1/rapid-worker";

const $ = id => document.getElementById(id);

const authStatus = $("authStatus");
const signInBtn = $("signInBtn");
const signOutBtn = $("signOutBtn");
const adminPanel = $("adminPanel");
const statusBox = $("status");
const questionForm = $("questionForm");
const questionList = $("questionList");
const questionListStatus = $("questionListStatus");
const filterSubject = $("filterSubject");
const searchQuestions = $("searchQuestions");
const saveBtn = $("saveBtn");
const formTitle = $("formTitle");
const cancelEditBtn = $("cancelEditBtn");

let currentUser = null;
let questions = [];
let busy = false;

function setStatus(message) {
  statusBox.textContent = message;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

async function workerRequest(data) {
  if (!auth.currentUser) {
    throw new Error("Please sign in first.");
  }

  const token = await auth.currentUser.getIdToken();

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
    throw new Error(
      result.error || `Request failed (HTTP ${response.status}).`
    );
  }

  return result;
}

function normalizeQuestion(item) {
  const options = item.options || {};

  return {
    id: item.id,
    subject: item.subject || "Mathematics",
    question: item.question || "",
    optionA: options.A ?? item.option_a ?? "",
    optionB: options.B ?? item.option_b ?? "",
    optionC: options.C ?? item.option_c ?? "",
    optionD: options.D ?? item.option_d ?? "",
    correctAnswer: item.correct_answer || item.correctAnswer || "A",
    explanation: item.explanation || "",
    isActive: item.is_active !== false
  };
}

function resetForm() {
  questionForm.reset();
  $("questionId").value = "";
  $("correctAnswer").value = "A";
  formTitle.textContent = "Add a Question";
  saveBtn.textContent = "Add Question";
  cancelEditBtn.hidden = true;
}

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

  formTitle.textContent = "Edit Question";
  saveBtn.textContent = "Save Changes";
  cancelEditBtn.hidden = false;

  $("editorCard").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function renderQuestions() {
  const subject = filterSubject.value;
  const search = searchQuestions.value.trim().toLowerCase();

  const filtered = questions.filter(item => {
    const matchesSubject = !subject || item.subject === subject;
    const matchesSearch =
      item.question.toLowerCase().includes(search) ||
      item.subject.toLowerCase().includes(search);

    return matchesSubject && matchesSearch;
  });

  $("activeCount").textContent =
    String(questions.filter(item => item.isActive).length);

  $("listedCount").textContent = String(questions.length);

  questionList.replaceChildren();

  if (!filtered.length) {
    questionListStatus.textContent = "No matching questions found.";
    return;
  }

  questionListStatus.textContent =
    `Showing ${filtered.length} question(s).`;

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "question-item";

    card.innerHTML = `
      <div class="question-meta">
        ID: ${escapeHTML(item.id)} ·
        ${escapeHTML(item.subject)} ·
        ${item.isActive ? "Active" : "Inactive"}
      </div>

      <p><strong>${escapeHTML(item.question)}</strong></p>

      <p class="muted">
        A. ${escapeHTML(item.optionA)}<br>
        B. ${escapeHTML(item.optionB)}<br>
        C. ${escapeHTML(item.optionC)}<br>
        D. ${escapeHTML(item.optionD)}
      </p>

      <p class="muted">
        Correct answer: ${escapeHTML(item.correctAnswer)}
      </p>

      <div class="actions">
        <button type="button" data-action="edit">Edit</button>
        <button type="button" class="secondary" data-action="toggle">
          ${item.isActive ? "Deactivate" : "Reactivate"}
        </button>
      </div>
    `;

    card.querySelector('[data-action="edit"]').addEventListener(
      "click",
      () => fillForm(item)
    );

    card.querySelector('[data-action="toggle"]').addEventListener(
      "click",
      () => toggleQuestion(item)
    );

    questionList.appendChild(card);
  });
}

async function loadQuestions() {
  if (busy) return;

  busy = true;
  $("refreshBtn").disabled = true;
  questionListStatus.textContent = "Loading questions...";

  try {
    const result = await workerRequest({
      action: "admin_list_questions"
    });

    const items = result.questions || result.data || [];

    questions = items.map(normalizeQuestion);
    renderQuestions();

    setStatus("Question bank loaded successfully.");
  } catch (error) {
    console.error("Admin question list error:", error);
    questionListStatus.textContent = error.message;
    setStatus(`Could not load questions: ${error.message}`);
  } finally {
    busy = false;
    $("refreshBtn").disabled = false;
  }
}

function collectForm() {
  return {
    subject: $("subject").value,
    question: $("question").value.trim(),
    options: {
      A: $("optionA").value.trim(),
      B: $("optionB").value.trim(),
      C: $("optionC").value.trim(),
      D: $("optionD").value.trim()
    },
    correct_answer: $("correctAnswer").value,
    explanation: $("explanation").value.trim()
  };
}

questionForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (busy) return;

  const questionId = $("questionId").value;
  const data = collectForm();

  if (
    !data.question ||
    !data.options.A ||
    !data.options.B ||
    !data.options.C ||
    !data.options.D
  ) {
    setStatus("Enter the question and all four options.");
    return;
  }

  busy = true;
  saveBtn.disabled = true;

  try {
    if (questionId) {
      await workerRequest({
        action: "admin_update_question",
        id: questionId,
        ...data
      });

      setStatus("Question updated successfully.");
    } else {
      await workerRequest({
        action: "admin_add_question",
        ...data
      });

      setStatus("Question added successfully.");
    }

    resetForm();
    await loadQuestions();
  } catch (error) {
    console.error("Save question error:", error);
    setStatus(`Could not save question: ${error.message}`);
  } finally {
    busy = false;
    saveBtn.disabled = false;
  }
});

async function toggleQuestion(item) {
  if (busy) return;

  const action = item.isActive
    ? "deactivate"
    : "reactivate";

  const confirmed = confirm(
    `${action === "deactivate" ? "Deactivate" : "Reactivate"} this question?`
  );

  if (!confirmed) return;

  busy = true;

  try {
    await workerRequest({
      action: "admin_update_question",
      id: item.id,
      is_active: !item.isActive
    });

    setStatus(
      item.isActive
        ? "Question deactivated."
        : "Question reactivated."
    );

    await loadQuestions();
  } catch (error) {
    console.error("Question status error:", error);
    setStatus(`Could not update question: ${error.message}`);
  } finally {
    busy = false;
  }
}

signInBtn.addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    setStatus(`Sign-in failed: ${error.message}`);
  }
});

signOutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    setStatus(`Sign-out failed: ${error.message}`);
  }
});

cancelEditBtn.addEventListener("click", resetForm);

$("refreshBtn").addEventListener("click", loadQuestions);
filterSubject.addEventListener("change", renderQuestions);
searchQuestions.addEventListener("input", renderQuestions);

$("homeBtn").addEventListener("click", () => {
  window.location.href = "battle.html";
});

onAuthStateChanged(auth, async user => {
  currentUser = user;

  adminPanel.hidden = true;
  signOutBtn.hidden = !user;
  signInBtn.hidden = !!user;

  if (!user) {
    authStatus.textContent = "You are not signed in.";
    setStatus("Sign in using your authorised admin account.");
    return;
  }

  authStatus.textContent =
    `Signed in as ${user.displayName || user.email || user.uid}`;

  try {
    // The server, not the browser, decides whether this user is an admin.
    await loadQuestions();
    adminPanel.hidden = false;
    setStatus("Admin controller ready.");
  } catch (error) {
    setStatus(`Admin access error: ${error.message}`);
  }
});
