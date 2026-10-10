import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9mgI_Atf0sxcDtQgF-hBLYPhEctELc6M",
  authDomain: "utme-waec-aspirants-hub.firebaseapp.com",
  projectId: "utme-waec-aspirants-hub",
  storageBucket: "utme-waec-aspirants-hub.firebasestorage.app",
  messagingSenderId: "483058761546",
  appId: "1:483058761546:web:ec6eaa3109eca1c941cbb3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const emailInput = document.getElementById("accountEmail");
const passwordInput = document.getElementById("accountPassword");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const message = document.getElementById("accountMessage");

let currentUser = null;
window.studentIsLoggedIn = false;
function showMessage(text) {
  if (message) message.textContent = text;
}

function getFriendlyError(code) {
  const errors = {
    "auth/email-already-in-use": "This email already has an account. Please log in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Choose a stronger password with at least 6 characters.",
    "auth/invalid-credential": "Incorrect email or password. Please check and try again.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
    "auth/too-many-requests": "Too many attempts. Please wait before trying again.",
    "permission-denied": "Database access denied. Please check the database rules."
  };

  return errors[code] || "Something went wrong. Please try again.";
}

if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage("Please enter your email and password.");
      return;
    }

    try {
      showMessage("Creating your account...");
      await createUserWithEmailAndPassword(auth, email, password);
      showMessage("Account created successfully!");
      passwordInput.value = "";
    } catch (error) {
      showMessage(getFriendlyError(error.code));
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage("Please enter your email and password.");
      return;
    }

    try {
      showMessage("Logging in...");
      await signInWithEmailAndPassword(auth, email, password);
      showMessage("Login successful!");
      passwordInput.value = "";
    } catch (error) {
      showMessage(getFriendlyError(error.code));
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      showMessage("You have logged out.");
    } catch (error) {
      showMessage("Logout failed. Please try again.");
    }
  });
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  window.studentIsLoggedIn = !!user;

  if (user) {
    showMessage("Logged in as " + user.email);

    if (registerBtn) registerBtn.hidden = true;
    if (loginBtn) loginBtn.hidden = true;
    if (logoutBtn) logoutBtn.hidden = false;
    if (emailInput) emailInput.value = user.email || "";
    if (passwordInput) passwordInput.value = "";
  } else {
    if (registerBtn) registerBtn.hidden = false;
    if (loginBtn) loginBtn.hidden = false;
    if (logoutBtn) logoutBtn.hidden = true;
  }
});

/*
  Save a quiz result for the currently signed-in student.
  The quiz app must call this function after calculating a score.
*/
window.saveQuizResult = async function (subject, score, total) {
  if (!currentUser) {
    showMessage("Please log in before saving your result.");
    return false;
  }

  if (
    typeof subject !== "string" ||
    !subject.trim() ||
    !Number.isInteger(score) ||
    !Number.isInteger(total) ||
    total <= 0 ||
    score < 0 ||
    score > total
  ) {
    showMessage("The quiz result is invalid.");
    return false;
  }

  try {
    await addDoc(
      collection(db, "students", currentUser.uid, "results"),
      {
        subject: subject.trim(),
        score: score,
        total: total,
        percentage: Math.round((score / total) * 100),
        date: serverTimestamp()
      }
    );

    showMessage("Quiz result saved successfully!");
    return true;
  } catch (error) {
    showMessage(getFriendlyError(error.code));
    return false;
  }
};

/*
  Load saved results for the currently signed-in student.
*/
window.loadQuizResults = async function () {
  if (!currentUser) {
    showMessage("Please log in to view your saved results.");
    return [];
  }

  try {
    const resultsQuery = query(
      collection(db, "students", currentUser.uid, "results"),
      orderBy("date", "desc")
    );

    const snapshot = await getDocs(resultsQuery);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    showMessage(getFriendlyError(error.code));
    return [];
  }
};
