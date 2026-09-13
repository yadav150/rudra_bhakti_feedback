/* =========================================================
   RUDRA BHAKTI — FIREBASE INITIALIZATION
   js/firebase.js
   ========================================================= */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { getAnalytics } from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";


/* ---------------------------------------------------------
   FIREBASE CONFIG
--------------------------------------------------------- */

const firebaseConfig = {
  apiKey: "AIzaSyAoPVLSklKARDfdDoSm6Lzkj1kabJVpsw",
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


/* ---------------------------------------------------------
   INITIALIZE FIREBASE
--------------------------------------------------------- */

const app = initializeApp(firebaseConfig);


/* ---------------------------------------------------------
   SERVICES
--------------------------------------------------------- */

const auth = getAuth(app);

const db = getFirestore(app);

let analytics = null;

try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn(
    "Firebase Analytics unavailable:",
    error
  );
}


/* ---------------------------------------------------------
   EXPORT
--------------------------------------------------------- */

export {
  app,
  auth,
  db,
  analytics
};
