import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";


/* =========================
   FIREBASE
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyAoPVLSklKARDfdDoSm6Lzkj1kabJVpsw",
  authDomain: "rudrabhakti-a1d3e.firebaseapp.com",
  projectId: "rudrabhakti-a1d3e",
  storageBucket: "rudrabhakti-a1d3e.firebasestorage.app",
  messagingSenderId: "96491326088",
  appId: "1:96491326088:web:16b33c95f6aa67b5936d3d",
  measurementId: "G-RYKGBGSLVB",
  databaseURL: "https://rudrabhakti-a1d3e-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getDatabase(app);


/* =========================
   AUTHORIZED ADMIN
========================= */

const ADMIN_UID =
  "YW8S06sHcMYtLNPHjO9otYNc2U13";


/* =========================
   DOM
========================= */

const loginScreen =
  document.getElementById("loginScreen");

const adminApp =
  document.getElementById("adminApp");

const loginForm =
  document.getElementById("loginForm");

const loginError =
  document.getElementById("loginError");

const logoutBtn =
  document.getElementById("logoutBtn");

const reelFilter =
  document.getElementById("reelFilter");

const refreshBtn =
  document.getElementById("refreshBtn");

const reelForm =
  document.getElementById("reelForm");

const reelIdInput =
  document.getElementById("reelId");

const reelTitleInput =
  document.getElementById("reelTitle");

const facebookUrlInput =
  document.getElementById("facebookUrl");

const thumbnailInput =
  document.getElementById("thumbnail");

const saveReelBtn =
  document.getElementById("saveReelBtn");

const cancelEditBtn =
  document.getElementById("cancelEditBtn");

const reelMessage =
  document.getElementById("reelMessage");

const reelFormTitle =
  document.getElementById("reelFormTitle");

const reelList =
  document.getElementById("reelList");


/* =========================
   STATE
========================= */

let allFeedback = {};
let reels = {};
let currentReel = "ALL";
let editingReelId = null;


/* =========================
   LABELS
========================= */

const LABELS = {

  FEEL_PEACEFUL: "Peaceful",
  FEEL_DEVOTIONAL: "Devotional",
  FEEL_EMOTIONAL: "Emotional",
  FEEL_INSPIRED: "Inspired",
  FEEL_CALM: "Calm",
  FEEL_DEEPLY_MOVED: "Deeply moved",

  MORE_DEFINITELY: "Definitely",
  MORE_SOMETIMES: "Sometimes",
  MORE_UNSURE: "Unsure",
  MORE_NOT_REALLY: "Not really",

  CONNECT_SHIVA_PARVATI: "Shiva & Parvati",
  CONNECT_DEVOTIONAL_FEELING: "Devotional feeling",
  CONNECT_ARTWORK: "Artwork",
  CONNECT_MUSIC: "Music",
  CONNECT_EVERYTHING: "Everything",

  RATING_1: "1 Star",
  RATING_2: "2 Stars",
  RATING_3: "3 Stars",
  RATING_4: "4 Stars",
  RATING_5: "5 Stars"
};


/* =========================
   LOGIN
========================= */

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    loginError.textContent = "";

    const email =
      document.getElementById("email")
        .value.trim();

    const password =
      document.getElementById("password")
        .value;

    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    } catch (error) {

      console.error(error);

      loginError.textContent =
        "Invalid email or password.";
    }
  }
);


/* =========================
   AUTH STATE
========================= */

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      loginScreen.classList.remove("hidden");
      adminApp.classList.add("hidden");

      return;
    }


    if (user.uid !== ADMIN_UID) {

      await signOut(auth);

      loginError.textContent =
        "This account is not authorized.";

      return;
    }


    loginScreen.classList.add("hidden");
    adminApp.classList.remove("hidden");

    await loadEverything();
  }
);


/* =========================
   LOGOUT
========================= */

logoutBtn.addEventListener(
  "click",
  async () => {

    await signOut(auth);
  }
);


/* =========================
   NAVIGATION
========================= */

document.querySelectorAll(".nav-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".nav-btn")
          .forEach(btn =>
            btn.classList.remove("active")
          );

        document
          .querySelectorAll(".view")
          .forEach(view =>
            view.classList.add("hidden")
          );

        button.classList.add("active");

        document
          .getElementById(button.dataset.view)
          .classList.remove("hidden");
      }
    );

  });


/* =========================
   LOAD EVERYTHING
========================= */

async function loadEverything() {

  await Promise.all([
    loadFeedback(),
    loadReels()
  ]);
}


/* =========================
   LOAD FEEDBACK
========================= */

async function loadFeedback() {

  try {

    const snapshot =
      await get(
        ref(db, "feedback_responses")
      );

    allFeedback =
      snapshot.exists()
        ? snapshot.val()
        : {};

    populateReelFilter();
    renderDashboard();

  } catch (error) {

    console.error(error);

    alert(
      "Unable to load feedback. Check Firebase Rules."
    );
  }
}


/* =========================
   LOAD REELS
========================= */

async function loadReels() {

  try {

    const snapshot =
      await get(
        ref(db, "reels")
      );

    reels =
      snapshot.exists()
        ? snapshot.val()
        : {};

    populateReelFilter();
    renderReelList();

  } catch (error) {

    console.error(error);

    renderReelList();
  }
}


/* =========================
   REEL FILTER
========================= */

function populateReelFilter() {

  const feedbackIds =
    Object.keys(allFeedback);

  const reelIds =
    Object.keys(reels);

  const ids =
    [...new Set([
      ...feedbackIds,
      ...reelIds
    ])];

  reelFilter.innerHTML =
    `<option value="ALL">All Reels</option>`;

  ids.forEach(id => {

    const option =
      document.createElement("option");

    option.value = id;

    option.textContent =
      reels[id]?.title
        ? `${id} — ${reels[id].title}`
        : id;

    reelFilter.appendChild(option);
  });

  if (
    currentReel === "ALL" ||
    ids.includes(currentReel)
  ) {

    reelFilter.value =
      currentReel;
  }
}


reelFilter.addEventListener(
  "change",
  () => {

    currentReel =
      reelFilter.value;

    renderDashboard();
  }
);


refreshBtn.addEventListener(
  "click",
  async () => {

    await loadEverything();
  }
);


/* =========================
   GET RESPONSES
========================= */

function getSelectedResponses() {

  if (currentReel === "ALL") {

    return Object.entries(allFeedback)
      .flatMap(
        ([reelId, responses]) =>

          Object.values(responses || {})
            .map(response => ({
              ...response,
              reelId
            }))
      );
  }


  return Object.values(
    allFeedback[currentReel] || {}
  ).map(response => ({
    ...response,
    reelId: currentReel
  }));
}


/* =========================
   DASHBOARD
========================= */

function renderDashboard() {

  const responses =
    getSelectedResponses();

  renderSummary(responses);

  renderDistribution(
    "feelingResults",
    responses,
    "Q_FEELING"
  );

  renderDistribution(
    "moreResults",
    responses,
    "Q_MORE_CONTENT"
  );

  renderDistribution(
    "connectionResults",
    responses,
    "Q_CONNECTION"
  );

  renderDistribution(
    "ratingResults",
    responses,
    "Q_RATING"
  );

  renderWrittenFeedback(responses);
}


/* =========================
   SUMMARY
========================= */

function renderSummary(responses) {

  const total =
    responses.length;

  document.getElementById(
    "totalResponses"
  ).textContent = total;


  let ratingTotal = 0;
  let ratingCount = 0;

  responses.forEach(response => {

    const id =
      response.answers?.Q_RATING;

    const number =
      Number(
        String(id || "")
          .replace("RATING_", "")
      );

    if (number >= 1 && number <= 5) {

      ratingTotal += number;
      ratingCount++;
    }
  });


  const average =
    ratingCount
      ? ratingTotal / ratingCount
      : 0;

  document.getElementById(
    "averageRating"
  ).textContent =
    average.toFixed(1);


  const more =
    responses.filter(response =>
      response.answers?.Q_MORE_CONTENT ===
        "MORE_DEFINITELY" ||
      response.answers?.Q_MORE_CONTENT ===
        "MORE_SOMETIMES"
    ).length;

  const morePercentage =
    total
      ? Math.round(
          (more / total) * 100
        )
      : 0;

  document.getElementById(
    "moreContent"
  ).textContent =
    `${morePercentage}%`;


  const counts = {};

  responses.forEach(response => {

    const id =
      response.answers?.Q_FEELING;

    if (!id) return;

    counts[id] =
      (counts[id] || 0) + 1;
  });


  const top =
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0];


  document.getElementById(
    "topFeeling"
  ).textContent =
    top
      ? LABELS[top[0]] || top[0]
      : "—";
}


/* =========================
   DISTRIBUTION
========================= */

function renderDistribution(
  elementId,
  responses,
  questionId
) {

  const container =
    document.getElementById(elementId);

  const counts = {};

  responses.forEach(response => {

    const answer =
      response.answers?.[questionId];

    if (!answer) return;

    counts[answer] =
      (counts[answer] || 0) + 1;
  });


  const total =
    responses.length;

  const sorted =
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1]);


  if (!sorted.length) {

    container.innerHTML =
      `<p class="feedback-meta">
        No responses yet.
      </p>`;

    return;
  }


  container.innerHTML =
    sorted.map(([id, count]) => {

      const percentage =
        total
          ? Math.round(
              (count / total) * 100
            )
          : 0;

      return `
        <div class="result-row">

          <div class="result-top">

            <span class="result-label">
              ${escapeHTML(
                LABELS[id] || id
              )}
            </span>

            <span class="result-value">
              ${count} · ${percentage}%
            </span>

          </div>

          <div class="bar">
            <div
              class="bar-fill"
              style="width:${percentage}%"
            ></div>
          </div>

        </div>
      `;

    }).join("");
}


/* =========================
   WRITTEN FEEDBACK
========================= */

function renderWrittenFeedback(responses) {

  const container =
    document.getElementById(
      "writtenFeedback"
    );

  const feedback =
    responses
      .filter(response => {

        const text =
          response.answers?.Q_OPEN_FEEDBACK;

        return (
          typeof text === "string" &&
          text.trim()
        );
      })
      .reverse();


  document.getElementById(
    "feedbackCount"
  ).textContent =
    feedback.length;


  if (!feedback.length) {

    container.innerHTML =
      `<p class="feedback-meta">
        No written feedback yet.
      </p>`;

    return;
  }


  container.innerHTML =
    feedback.map(response => {

      const text =
        response.answers.Q_OPEN_FEEDBACK;

      return `
        <div class="feedback-item">

          <div class="feedback-text">
            ${escapeHTML(text)}
          </div>

          <div class="feedback-meta">
            Reel: ${escapeHTML(
              response.reelId || "Unknown"
            )}
          </div>

        </div>
      `;

    }).join("");
}


/* =========================================================
   REEL MANAGEMENT
========================================================= */


/* ADD / EDIT */

reelForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    reelMessage.textContent = "";
    reelMessage.className = "";

    const id =
      reelIdInput.value
        .trim()
        .toUpperCase();

    const title =
      reelTitleInput.value.trim();

    const facebookUrl =
      facebookUrlInput.value.trim();

    const thumbnail =
      thumbnailInput.value.trim();


    if (!/^RB[0-9]+$/.test(id)) {

      showReelMessage(
        "Reel ID must look like RB001, RB002, etc.",
        true
      );

      return;
    }


    if (!title) {

      showReelMessage(
        "Please enter a Reel title.",
        true
      );

      return;
    }


    try {

      const reelData = {
        title,
        facebookUrl,
        thumbnail,
        updated_at: Date.now()
      };


      /* NEW REEL */

      if (!editingReelId) {

        if (reels[id]) {

          showReelMessage(
            "This Reel ID already exists.",
            true
          );

          return;
        }


        reelData.created_at =
          Date.now();


        await set(
          ref(db, `reels/${id}`),
          reelData
        );


        showReelMessage(
          `${id} added successfully.`
        );
      }


      /* EDIT */

      else {

        await update(
          ref(db, `reels/${editingReelId}`),
          reelData
        );


        showReelMessage(
          `${editingReelId} updated successfully.`
        );
      }


      resetReelForm();

      await loadReels();

    } catch (error) {

      console.error(error);

      showReelMessage(
        "Unable to save Reel. Check Firebase Rules.",
        true
      );
    }
  }
);


/* =========================
   EDIT REEL
========================= */

function editReel(id) {

  const reel =
    reels[id];

  if (!reel) return;

  editingReelId =
    id;

  reelIdInput.value =
    id;

  reelIdInput.disabled =
    true;

  reelTitleInput.value =
    reel.title || "";

  facebookUrlInput.value =
    reel.facebookUrl || "";

  thumbnailInput.value =
    reel.thumbnail || "";

  reelFormTitle.textContent =
    `Edit ${id}`;

  saveReelBtn.textContent =
    "Save Changes";

  cancelEditBtn.classList.remove(
    "hidden"
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================
   CANCEL EDIT
========================= */

cancelEditBtn.addEventListener(
  "click",
  () => {

    resetReelForm();
  }
);


/* =========================
   RESET FORM
========================= */

function resetReelForm() {

  editingReelId =
    null;

  reelForm.reset();

  reelIdInput.disabled =
    false;

  reelFormTitle.textContent =
    "Add New Reel";

  saveReelBtn.textContent =
    "Add Reel";

  cancelEditBtn.classList.add(
    "hidden"
  );
}


/* =========================
   DELETE REEL
========================= */

async function deleteReel(id) {

  const confirmed =
    confirm(
      `Delete ${id}?\n\nThis removes the Reel information, but does NOT delete existing feedback responses.`
    );

  if (!confirmed) return;


  try {

    await remove(
      ref(db, `reels/${id}`)
    );

    if (currentReel === id) {

      currentReel = "ALL";
    }

    await loadReels();

    renderDashboard();

  } catch (error) {

    console.error(error);

    alert(
      "Unable to delete Reel. Check Firebase Rules."
    );
  }
}


/* =========================
   REEL LIST
========================= */

function renderReelList() {

  const ids =
    Object.keys(reels)
      .sort();


  document.getElementById(
    "reelCount"
  ).textContent =
    ids.length;


  if (!ids.length) {

    reelList.innerHTML =
      `<p class="feedback-meta">
        No Reels added yet.
      </p>`;

    return;
  }


  reelList.innerHTML =
    ids.map(id => {

      const reel =
        reels[id];

      const feedbackLink =
        `${window.location.origin}${window.location.pathname.replace(
          /admin\.html$/,
          ""
        )}?reel=${encodeURIComponent(id)}`;


      return `
        <div class="reel-item">

          <div class="reel-item-main">

            <div class="reel-info">

              <div class="reel-id">
                ${escapeHTML(id)}
              </div>

              <h3>
                ${escapeHTML(
                  reel.title || "Untitled Reel"
                )}
              </h3>

              ${
                reel.facebookUrl
                  ? `
                    <div class="reel-url">
                      ${escapeHTML(
                        reel.facebookUrl
                      )}
                    </div>
                  `
                  : ""
              }

            </div>


            <div class="reel-actions">

              <button
                data-action="copy"
                data-id="${escapeHTML(id)}"
              >
                Copy Link
              </button>

              <button
                data-action="edit"
                data-id="${escapeHTML(id)}"
              >
                Edit
              </button>

              <button
                class="delete-btn"
                data-action="delete"
                data-id="${escapeHTML(id)}"
              >
                Delete
              </button>

            </div>

          </div>

        </div>
      `;

    }).join("");
}


/* =========================
   REEL ACTIONS
========================= */

reelList.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest("button");

    if (!button) return;

    const id =
      button.dataset.id;

    const action =
      button.dataset.action;


    if (action === "edit") {

      editReel(id);
    }


    if (action === "delete") {

      await deleteReel(id);
    }


    if (action === "copy") {

      const link =
        `${window.location.origin}${window.location.pathname.replace(
          /admin\.html$/,
          ""
        )}?reel=${encodeURIComponent(id)}`;

      try {

        await navigator.clipboard.writeText(link);

        button.textContent =
          "Copied!";

        setTimeout(() => {
          button.textContent =
            "Copy Link";
        }, 1200);

      } catch {

        alert(link);
      }
    }

  }
);


/* =========================
   MESSAGE
========================= */

function showReelMessage(
  message,
  error = false
) {

  reelMessage.textContent =
    message;

  reelMessage.className =
    error
      ? "message-error"
      : "message-success";
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
