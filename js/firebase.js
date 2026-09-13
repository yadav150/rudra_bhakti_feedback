/* =========================================================
   RUDRA BHAKTI — FIREBASE INITIALIZATION
   js/firebase.js
   Realtime Database + Authentication + Analytics
   ========================================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

import {
  getAnalytics
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";


/* =========================================================
   FIREBASE CONFIG
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyAoPVLSklKARDfdDoSm6Lzk1kabJVpsw",
  authDomain: "rudrabhakti-a1d3e.firebaseapp.com",
  databaseURL:
    "https://rudrabhakti-a1d3e-default-rtdb.firebaseio.com",
  projectId: "rudrabhakti-a1d3e",
  storageBucket:
    "rudrabhakti-a1d3e.firebasestorage.app",
  messagingSenderId: "96491326088",
  appId:
    "1:96491326088:web:16b33c95f6aa67b5936d3d",
  measurementId: "G-RYKGBGSLVB"
};


/* =========================================================
   INITIALIZE FIREBASE
   ========================================================= */

const app =
  initializeApp(firebaseConfig);


/* =========================================================
   FIREBASE AUTHENTICATION
   ========================================================= */

const auth =
  getAuth(app);


/* =========================================================
   REALTIME DATABASE
   ========================================================= */

const db =
  getDatabase(app);


/* =========================================================
   GOOGLE ANALYTICS
   ========================================================= */

let analytics = null;

try {
  analytics =
    getAnalytics(app);
} catch (error) {
  console.warn(
    "Firebase Analytics unavailable:",
    error
  );
}


/* =========================================================
   EXPORT
   ========================================================= */

export {
  app,
  auth,
  db,
  analytics
};
