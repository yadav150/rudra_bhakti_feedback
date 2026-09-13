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
  remove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";


/* =========================
   FIREBASE
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyAoSVklKARDfdDoSm6L2zkj1kabJVpsw",
  authDomain: "rudrabhakti-a1d3e.firebaseapp.com",
  databaseURL: "https://rudrabhakti-a1d3e-default-rtdb.firebaseio.com",
  projectId: "rudrabhakti-a1d3e",
  storageBucket: "rudrabhakti-a1d3e.firebasestorage.app",
  messagingSenderId: "96491326088",
  appId: "1:96491326088:web:593b15e565a12f57936d3d",
  measurementId: "G-DF9MKJ113R"
};

const ADMIN_UID =
  "y7u3uoHSiycapycRb2z12Hk0F1E2";


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


/* =========================
   ELEMENTS
========================= */

const loginScreen = document.getElementById("loginScreen");
const dashboardScreen = document.getElementById("dashboardScreen");

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");

const logoutBtn = document.getElementById("logoutBtn");

const navButtons =
  document.querySelectorAll(".nav-btn");

const reelFilter =
  document.getElementById("reelFilter");

const reelForm =
  document.getElementById("reelForm");

const facebookUrlInput =
  document.getElementById("facebookUrl");

const generatedReelId =
  document.getElementById("generatedReelId");

const generatedTitle =
  document.getElementById("generatedTitle");

const metadataStatus =
  document.getElementById("metadataStatus");

const fetchMetadataBtn =
  document.getElementById("fetchMetadataBtn");

const reelFormMessage =
  document.getElementById("reelFormMessage");

const reelList =
  document.getElementById("reelList");


/* =========================
   DATA
========================= */

let reelsData = {};
let feedbackData = {};

let editingReelId = null;
let fetchedMetadata = null;


/* =========================
   AUTH
========================= */

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.textContent = "";

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  } catch (error) {
    console.error(error);

    loginError.textContent =
      friendlyAuthError(error.code);
  }
});


onAuthStateChanged(auth, async (user) => {

  if (!user) {
    loginScreen.classList.remove("hidden");
    dashboardScreen.classList.add("hidden");
    return;
  }

  if (user.uid !== ADMIN_UID) {

    await signOut(auth);

    loginError.textContent =
      "This account is not authorized.";

    return;
  }

  loginScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");

  await loadDashboard();
});


/* =========================
   LOGOUT CONFIRMATION
========================= */

logoutBtn.addEventListener("click", async () => {

  const confirmed = confirm(
    "Are you sure you want to logout?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
    alert("Logout failed. Please try again.");
  }
});


function friendlyAuthError(code) {

  switch (code) {

    case "auth/invalid-credential":
      return "Invalid email or password.";

    case "auth/invalid-email":
      return "Please enter a valid email.";

    case "auth/user-disabled":
      return "This account has been disabled.";

    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    default:
      return "Login failed. Please check your details.";
  }
}


/* =========================
   NAVIGATION
========================= */

navButtons.forEach((button) => {

  button.addEventListener("click", () => {

    navButtons.forEach((btn) =>
      btn.classList.remove("active")
    );

    button.classList.add("active");

    document
      .querySelectorAll(".admin-view")
      .forEach((view) => {
        view.classList.add("hidden");
      });

    const target =
      document.getElementById(button.dataset.view);

    target.classList.remove("hidden");
  });
});


/* =========================
   DASHBOARD
========================= */

async function loadDashboard() {

  try {

    await Promise.all([
      loadReels(),
      loadFeedback()
    ]);

    populateReelFilter();
    renderAnalytics();

  } catch (error) {

    console.error(error);

    alert(
      "Could not load dashboard data."
    );
  }
}


/* =========================
   LOAD REELS
========================= */

async function loadReels() {

  const snapshot =
    await get(ref(db, "reels"));

  reelsData =
    snapshot.exists()
      ? snapshot.val()
      : {};

  populateReelFilter();
  renderReelList();

  updateGeneratedReelId();
}


/* =========================
   LOAD FEEDBACK
========================= */

async function loadFeedback() {

  const snapshot =
    await get(ref(db, "feedback_responses"));

  feedbackData =
    snapshot.exists()
      ? snapshot.val()
      : {};
}


/* =========================
   AUTO REEL ID
========================= */

function getNextReelId() {

  const numbers = Object.keys(reelsData)
    .map(id => {

      const match =
        /^RB(\d+)$/.exec(id);

      return match
        ? Number(match[1])
        : 0;
    })
    .filter(number => number > 0);

  let next =
    numbers.length
      ? Math.max(...numbers) + 1
      : 1;

  let candidate;

  do {

    candidate =
      `RB${String(next).padStart(3, "0")}`;

    next++;

  } while (reelsData[candidate]);

  return candidate;
}


function updateGeneratedReelId() {

  if (editingReelId) {
    generatedReelId.textContent =
      editingReelId;
    return;
  }

  generatedReelId.textContent =
    getNextReelId();
}


/* =========================
   FACEBOOK URL
========================= */

function isFacebookUrl(url) {

  try {

    const parsed =
      new URL(url);

    return (
      parsed.hostname === "facebook.com" ||
      parsed.hostname.endsWith(".facebook.com")
    );

  } catch {
    return false;
  }
}


/* =========================
   METADATA FETCH
========================= */

async function fetchReelMetadata(url) {

  metadataStatus.textContent =
    "Fetching Reel information…";

  metadataStatus.style.color = "#555";

  fetchedMetadata = null;

  /*
    Facebook frequently blocks browser-side metadata
    requests. We first try Facebook oEmbed.
  */

  const endpoints = [

    `https://www.facebook.com/plugins/post/oembed.json?url=${encodeURIComponent(url)}`,

    `https://www.facebook.com/plugins/video/oembed.json?url=${encodeURIComponent(url)}`
  ];


  for (const endpoint of endpoints) {

    try {

      const response =
        await fetch(endpoint);

      if (!response.ok) {
        continue;
      }

      const data =
        await response.json();

      if (data) {

        fetchedMetadata = {
          title:
            data.title ||
            data.author_name ||
            null,

          thumbnail:
            data.thumbnail_url ||
            null
        };

        if (fetchedMetadata.title) {

          generatedTitle.textContent =
            fetchedMetadata.title;

          metadataStatus.textContent =
            "Reel information detected.";

          metadataStatus.style.color =
            "#287a3e";

          return fetchedMetadata;
        }
      }

    } catch (error) {

      console.warn(
        "Metadata request failed:",
        error
      );
    }
  }


  /*
    Facebook blocked metadata request.
    We do not invent a fake Facebook title.
  */

  const fallbackTitle =
    `Rudra Bhakti Reel ${generatedReelId.textContent}`;

  fetchedMetadata = {
    title: fallbackTitle,
    thumbnail: null
  };

  generatedTitle.textContent =
    fallbackTitle;

  metadataStatus.textContent =
    "Facebook title could not be fetched automatically. A safe fallback title will be used.";

  metadataStatus.style.color =
    "#777";

  return fetchedMetadata;
}


/* =========================
   FETCH BUTTON
========================= */

fetchMetadataBtn.addEventListener(
  "click",
  async () => {

    const url =
      facebookUrlInput.value.trim();

    if (!url) {

      metadataStatus.textContent =
        "Paste the Facebook Reel URL first.";

      return;
    }

    if (!isFacebookUrl(url)) {

      metadataStatus.textContent =
        "Please enter a valid Facebook URL.";

      return;
    }

    await fetchReelMetadata(url);
  }
);


/* =========================
   URL INPUT
========================= */

facebookUrlInput.addEventListener(
  "input",
  () => {

    fetchedMetadata = null;

    generatedTitle.textContent =
      "Waiting for URL…";

    metadataStatus.textContent = "";

    updateGeneratedReelId();
  }
);


/* =========================
   ADD / EDIT REEL
========================= */

reelForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    reelFormMessage.textContent = "";

    const url =
      facebookUrlInput.value.trim();

    if (!isFacebookUrl(url)) {

      reelFormMessage.textContent =
        "Please enter a valid Facebook Reel URL.";

      return;
    }


    try {

      const reelId =
        editingReelId ||
        getNextReelId();


      /*
        If metadata has not been fetched yet,
        automatically attempt it before saving.
      */

      if (!fetchedMetadata) {
        await fetchReelMetadata(url);
      }


      const title =
        fetchedMetadata?.title ||
        `Rudra Bhakti Reel ${reelId}`;


      const thumbnail =
        fetchedMetadata?.thumbnail ||
        "";


      const reelRef =
        ref(db, `reels/${reelId}`);


      const existing =
        reelsData[reelId];


      if (existing) {

        await update(
          reelRef,
          {
            title,
            facebookUrl: url,
            thumbnail,

            updated_at:
              serverTimestamp()
          }
        );

      } else {

        await set(
          reelRef,
          {
            title,
            facebookUrl: url,
            thumbnail,

            created_at:
              serverTimestamp(),

            updated_at:
              serverTimestamp()
          }
        );
      }


      reelFormMessage.textContent =
        editingReelId
          ? `${reelId} updated successfully.`
          : `${reelId} added successfully.`;


      await loadReels();


      resetReelForm();


    } catch (error) {

      console.error(error);

      reelFormMessage.textContent =
        "Could not save Reel. Please try again.";
    }
  }
);


/* =========================
   RESET FORM
========================= */

function resetReelForm() {

  editingReelId = null;
  fetchedMetadata = null;

  reelForm.reset();

  generatedTitle.textContent =
    "Waiting for URL…";

  metadataStatus.textContent = "";

  updateGeneratedReelId();

  document.getElementById(
    "saveReelBtn"
  ).textContent = "Add Reel";
}


/* =========================
   REEL FILTER
========================= */

reelFilter.addEventListener(
  "change",
  () => {
    renderAnalytics();
  }
);


function populateReelFilter() {

  const current =
    reelFilter.value;

  reelFilter.innerHTML =
    `<option value="ALL">All Reels</option>`;

  Object.keys(reelsData)
    .sort()
    .forEach(id => {

      const option =
        document.createElement("option");

      option.value = id;

      option.textContent =
        `${id} — ${reelsData[id].title || "Untitled"}`;

      reelFilter.appendChild(option);
    });


  if (
    current &&
    (
      current === "ALL" ||
      reelsData[current]
    )
  ) {
    reelFilter.value = current;
  }
}


/* =========================
   RENDER REEL LIST
========================= */

function renderReelList() {

  const ids =
    Object.keys(reelsData).sort();

  if (!ids.length) {

    reelList.innerHTML =
      `<p class="empty-state">No Reels added yet.</p>`;

    return;
  }


  reelList.innerHTML =
    ids.map(id => {

      const reel =
        reelsData[id];

      const link =
        `${window.location.origin}${window.location.pathname.replace(
          /admin\.html$/,
          ""
        )}?reel=${encodeURIComponent(id)}`;


      return `
        <div class="reel-item">

          <div class="reel-info">

            <strong>
              ${escapeHTML(id)} —
              ${escapeHTML(reel.title || "Untitled")}
            </strong>

            <small>
              ${escapeHTML(reel.facebookUrl || "")}
            </small>

          </div>

          <div class="reel-actions">

            <button
              class="small-btn"
              data-action="copy"
              data-id="${escapeHTML(id)}"
              data-link="${escapeHTML(link)}"
            >
              Copy Link
            </button>

            <button
              class="small-btn"
              data-action="edit"
              data-id="${escapeHTML(id)}"
            >
              Edit
            </button>

            <button
              class="small-btn"
              data-action="delete"
              data-id="${escapeHTML(id)}"
            >
              Delete
            </button>

          </div>

        </div>
      `;

    }).join("");


  reelList
    .querySelectorAll("button")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const action =
            button.dataset.action;

          const id =
            button.dataset.id;


          if (action === "copy") {

            await navigator.clipboard.writeText(
              button.dataset.link
            );

            button.textContent =
              "Copied!";

            setTimeout(() => {
              button.textContent =
                "Copy Link";
            }, 1500);
          }


          if (action === "edit") {
            editReel(id);
          }


          if (action === "delete") {
            deleteReel(id);
          }

        }
      );

    });
}


/* =========================
   EDIT REEL
========================= */

function editReel(id) {

  const reel =
    reelsData[id];

  if (!reel) {
    return;
  }

  editingReelId = id;

  facebookUrlInput.value =
    reel.facebookUrl || "";

  generatedReelId.textContent =
    id;

  generatedTitle.textContent =
    reel.title || "Untitled";

  fetchedMetadata = {
    title: reel.title || `Rudra Bhakti Reel ${id}`,
    thumbnail: reel.thumbnail || ""
  };

  document.getElementById(
    "saveReelBtn"
  ).textContent = "Update Reel";


  navButtons.forEach(btn =>
    btn.classList.remove("active")
  );

  const addButton =
    document.querySelector(
      '[data-view="addReelView"]'
    );

  addButton.classList.add("active");


  document
    .querySelectorAll(".admin-view")
    .forEach(view =>
      view.classList.add("hidden")
    );

  document
    .getElementById("addReelView")
    .classList.remove("hidden");


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================
   DELETE REEL
========================= */

async function deleteReel(id) {

  const confirmed =
    confirm(
      `Delete ${id} from the Reel list?\n\nExisting feedback responses will NOT be deleted.`
    );

  if (!confirmed) {
    return;
  }


  try {

    await remove(
      ref(db, `reels/${id}`)
    );

    delete reelsData[id];

    populateReelFilter();
    renderReelList();
    renderAnalytics();
    updateGeneratedReelId();


  } catch (error) {

    console.error(error);

    alert(
      "Could not delete Reel."
    );
  }
}


/* =========================
   ANALYTICS
========================= */

function renderAnalytics() {

  const selected =
    reelFilter.value;


  let responses = [];


  Object.entries(feedbackData)
    .forEach(([reelId, reelResponses]) => {

      if (
        selected !== "ALL" &&
        reelId !== selected
      ) {
        return;
      }


      Object.values(
        reelResponses || {}
      ).forEach(response => {

        responses.push({
          reelId,
          ...response
        });

      });

    });


  document.getElementById(
    "totalResponses"
  ).textContent =
    responses.length;


  renderAverageRating(responses);
  renderWantMore(responses);
  renderFeeling(responses);
  renderDistribution(
    responses,
    "Q_FEELING",
    "feelingDistribution",
    {
      FEEL_PEACEFUL: "Peaceful",
      FEEL_DEVOTIONAL: "Devotional",
      FEEL_EMOTIONAL: "Emotional",
      FEEL_INSPIRED: "Inspired",
      FEEL_CALM: "Calm",
      FEEL_DEEPLY_MOVED: "Deeply Moved"
    }
  );


  renderDistribution(
    responses,
    "Q_MORE_CONTENT",
    "moreDistribution",
    {
      MORE_DEFINITELY: "Definitely",
      MORE_SOMETIMES: "Sometimes",
      MORE_UNSURE: "Unsure",
      MORE_NOT_REALLY: "Not Really"
    }
  );


  renderDistribution(
    responses,
    "Q_CONNECTION",
    "connectionDistribution",
    {
      CONNECT_SHIVA_PARVATI: "Shiva & Parvati",
      CONNECT_DEVOTIONAL_FEELING: "Devotional Feeling",
      CONNECT_ARTWORK: "Artwork",
      CONNECT_MUSIC: "Music",
      CONNECT_EVERYTHING: "Everything"
    }
  );


  renderDistribution(
    responses,
    "Q_RATING",
    "ratingDistribution",
    {
      RATING_1: "1 Star",
      RATING_2: "2 Stars",
      RATING_3: "3 Stars",
      RATING_4: "4 Stars",
      RATING_5: "5 Stars"
    }
  );


  renderWrittenFeedback(responses);
}


/* =========================
   RATING
========================= */

function renderAverageRating(responses) {

  const ratings =
    responses
      .map(r =>
        ratingNumber(
          r.answers?.Q_RATING
        )
      )
      .filter(Boolean);


  const average =
    ratings.length
      ? ratings.reduce(
          (a, b) => a + b,
          0
        ) / ratings.length
      : 0;


  document.getElementById(
    "averageRating"
  ).textContent =
    average.toFixed(1);
}


function ratingNumber(id) {

  const match =
    /^RATING_(\d)$/.exec(id || "");

  return match
    ? Number(match[1])
    : 0;
}


/* =========================
   WANT MORE
========================= */

function renderWantMore(responses) {

  if (!responses.length) {

    document.getElementById(
      "wantMore"
    ).textContent = "0%";

    return;
  }


  const yes =
    responses.filter(
      r =>
        r.answers?.Q_MORE_CONTENT ===
        "MORE_DEFINITELY"
    ).length;


  const percentage =
    (yes / responses.length) * 100;


  document.getElementById(
    "wantMore"
  ).textContent =
    `${percentage.toFixed(0)}%`;
}


/* =========================
   TOP FEELING
========================= */

function renderFeeling(responses) {

  const counts = {};

  responses.forEach(r => {

    const id =
      r.answers?.Q_FEELING;

    if (id) {
      counts[id] =
        (counts[id] || 0) + 1;
    }
  });


  const labels = {
    FEEL_PEACEFUL: "Peaceful",
    FEEL_DEVOTIONAL: "Devotional",
    FEEL_EMOTIONAL: "Emotional",
    FEEL_INSPIRED: "Inspired",
    FEEL_CALM: "Calm",
    FEEL_DEEPLY_MOVED: "Deeply Moved"
  };


  const top =
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0];


  document.getElementById(
    "topFeeling"
  ).textContent =
    top
      ? labels[top[0]] || top[0]
      : "—";
}


/* =========================
   DISTRIBUTIONS
========================= */

function renderDistribution(
  responses,
  answerKey,
  elementId,
  labels
) {

  const element =
    document.getElementById(elementId);

  const counts = {};

  Object.keys(labels).forEach(
    id => counts[id] = 0
  );


  responses.forEach(r => {

    const value =
      r.answers?.[answerKey];

    if (
      value &&
      Object.prototype.hasOwnProperty.call(
        counts,
        value
      )
    ) {
      counts[value]++;
    }
  });


  const total =
    responses.length;


  element.innerHTML =
    Object.entries(labels)
      .map(([id, label]) => {

        const count =
          counts[id] || 0;

        const percentage =
          total
            ? (count / total) * 100
            : 0;


        return `
          <div class="distribution-row">

            <div class="distribution-label">
              <span>${escapeHTML(label)}</span>
              <span>
                ${count} · ${percentage.toFixed(0)}%
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


  const written =
    responses.filter(
      r =>
        r.answers?.Q_OPEN_FEEDBACK &&
        r.answers.Q_OPEN_FEEDBACK.trim()
    );


  if (!written.length) {

    container.innerHTML =
      `<p class="empty-state">No written feedback yet.</p>`;

    return;
  }


  container.innerHTML =
    written
      .slice()
      .reverse()
      .map(r => {

        const reelTitle =
          reelsData[r.reelId]?.title ||
          r.reelId;


        return `
          <div class="feedback-item">

            <p>
              ${escapeHTML(
                r.answers.Q_OPEN_FEEDBACK
              )}
            </p>

            <small>
              ${escapeHTML(r.reelId)}
              —
              ${escapeHTML(reelTitle)}
            </small>

          </div>
        `;

      }).join("");
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
