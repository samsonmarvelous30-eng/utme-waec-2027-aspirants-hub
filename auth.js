import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

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

const emailInput = document.getElementById("accountEmail");
const passwordInput = document.getElementById("accountPassword");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const message = document.getElementById("accountMessage");

function showMessage(text) {
  message.textContent = text;
}

registerBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage("Please enter your email and password.");
    return;
  }

  if (password.length < 6) {
    showMessage("Your password must contain at least 6 characters.");
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

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showMessage("You have logged out.");
  } catch (error) {
    showMessage("Logout failed. Please try again.");
  }
});

onAuthStateChanged(auth, user => {
  if (user) {
    showMessage("Logged in as " + user.email);
    registerBtn.hidden = true;
    loginBtn.hidden = true;
    logoutBtn.hidden = false;
    emailInput.value = user.email || "";
    passwordInput.value = "";
  } else {
    registerBtn.hidden = false;
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
  }
});

function getFriendlyError(code) {
  const errors = {
    "auth/email-already-in-use": "This email already has an account. Please log in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Choose a stronger password with at least 6 characters.",
    "auth/invalid-credential": "Incorrect email or password. Please check and try again.",
    "auth/network-request-failed": "Network error. Check your internet connection.",
    "auth/too-many-requests": "Too many attempts. Please wait before trying again."
  };

  return errors[code] || "Something went wrong. Please try again.";
}
