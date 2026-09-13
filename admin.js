// admin.js
// Rudra Bhakti — Secure Admin Dashboard
// Firebase Realtime Database only

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

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
  push,
  set,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAoPVLSklKARDfdDoSm6Lzkj1kabJVpsw",
  authDomain: "rudrabhakti-a1d3e.firebaseapp.com",
  projectId: "rudrabhakti-a1d3e",
  storageBucket: "rudrabhakti-a1d3e.firebasestorage.app",
  messagingSenderId: "96491326088",
  appId: "1:96491326088:web:16b33c95f6aa67b5936d3d",
  measurementId: "G-RYKGBGSLVB"
};

const DATABASE_URL =
  "https://rudrabhakti-a1d3e-default-rtdb.firebaseio.com/";

const AUTHORIZED_ADMIN_UID =
  "YW8S06sHcMYtLNPHjO9otYNc2U13";

const SCHEMA_VERSION = "1.1";

// Leave blank until a server-side metadata endpoint is available.
// The browser must NOT attempt to scrape arbitrary Facebook pages.
const METADATA_ENDPOINT = "";


// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const db = getDatabase(app, DATABASE_URL);


// ============================================================
// DOM HELPERS
// ============================================================

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [...document.querySelectorAll(selector)];


// ============================================================
// APPLICATION STATE
// ============================================================

const state = {
  user: null,

  reels: {},
  responses: {},

  activeSection: "analytics",

  selectedReel: "all",
  selectedRating: "all",
  selectedPeriod: "all",

  filteredResponses: [],

  currentGeneratedReelId: "",
  currentFeedbackUrl: ""
};


// ============================================================
// QUESTION LABELS
// ============================================================

const FEELING_LABELS = {
  FEEL_PEACEFUL: "Peaceful",
  FEEL_DEVOTIONAL: "Devotional",
  FEEL_EMOTIONAL: "Emotional",
  FEEL_INSPIRED: "Inspired",
  FEEL_CALM: "Calm",
  FEEL_DEEPLY_MOVED: "Deeply Moved"
};

const MORE_CONTENT_LABELS = {
  MORE_DEFINITELY: "Definitely",
  MORE_SOMETIMES: "Sometimes",
  MORE_UNSURE: "Not Sure",
  MORE_NOT_REALLY: "Not Really"
};

const CONNECTION_LABELS = {
  CONNECT_SHIVA_PARVATI: "Shiva & Parvati",
  CONNECT_DEVOTIONAL_FEELING: "Devotional Feeling",
  CONNECT_ARTWORK: "Artwork",
  CONNECT_MUSIC: "Music",
  CONNECT_EVERYTHING: "Everything"
};

const RATING_LABELS = {
  RATING_1: "1",
  RATING_2: "2",
  RATING_3: "3",
  RATING_4: "4",
  RATING_5: "5"
};


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  initializeUI();
  initializeAuth();
});


// ============================================================
// UI INITIALIZATION
// ============================================================

function initializeUI() {
  bindLoginEvents();
  bindDashboardEvents();
  bindNavigation();
  bindFilters();
  bindReelManagement();
  bindPasswordToggle();
}


// ============================================================
// AUTHENTICATION
// ============================================================

function initializeAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      state.user = null;
      showLoginScreen();
      return;
    }

    if (user.uid !== AUTHORIZED_ADMIN_UID) {
      showLoginError("This account is not authorized to access the admin dashboard.");

      try {
        await signOut(auth);
      } catch (error) {
        console.error("Unauthorized sign-out error:", error);
      }

      return;
    }

    state.user = user;

    showDashboard();

    await loadAdminData();
  });
}


function bindLoginEvents() {
  const form = $("#loginForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("#adminEmail")?.value.trim();
    const password = $("#adminPassword")?.value;

    if (!email || !password) {
      showLoginError("Enter your email and password.");
      return;
    }

    clearLoginError();
    setButtonLoading("#loginButton", true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (credential.user.uid !== AUTHORIZED_ADMIN_UID) {
        await signOut(auth);
        throw new Error("UNAUTHORIZED_ADMIN");
      }

    } catch (error) {
      console.error("Login error:", error);

      if (error.message === "UNAUTHORIZED_ADMIN") {
        showLoginError(
          "This Firebase account is not authorized for this dashboard."
        );
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        showLoginError("Incorrect email or password.");
      } else if (error.code === "auth/too-many-requests") {
        showLoginError(
          "Too many unsuccessful attempts. Please try again later."
        );
      } else {
        showLoginError("Unable to sign in. Please check your credentials.");
      }
    } finally {
      setButtonLoading("#loginButton", false);
    }
  });
}


function showLoginScreen() {
  $("#loginScreen")?.classList.remove("hidden");
  $("#adminApp")?.classList.add("hidden");
}


function showDashboard() {
  $("#loginScreen")?.classList.add("hidden");
  $("#adminApp")?.classList.remove("hidden");
}


function showLoginError(message) {
  const element = $("#loginError");

  if (!element) return;

  element.textContent = message;
  element.classList.remove("hidden");
}


function clearLoginError() {
  $("#loginError")?.classList.add("hidden");
}


// ============================================================
// PASSWORD TOGGLE
// ============================================================

function bindPasswordToggle() {
  const button = $("#togglePassword");

  if (!button) return;

  button.addEventListener("click", () => {
    const input = $("#adminPassword");

    if (!input) return;

    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";

    button.setAttribute(
      "aria-label",
      isPassword ? "Hide password" : "Show password"
    );

    button.innerHTML = isPassword
      ? eyeOffIcon()
      : eyeIcon();
  });
}


// ============================================================
// DASHBOARD EVENTS
// ============================================================

function bindDashboardEvents() {
  $("#logoutButton")?.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Unable to sign out.", "error");
    }
  });

  $("#refreshAnalytics")?.addEventListener("click", async () => {
    await loadAdminData();
  });
}


// ============================================================
// NAVIGATION
// ============================================================

function bindNavigation() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.section;

      if (!section) return;

      switchSection(section);
    });
  });
}


function switchSection(section) {
  state.activeSection = section;

  $$(".nav-item").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.section === section
    );
  });

  $$(".admin-section").forEach((element) => {
    element.classList.toggle(
      "active",
      element.id === `${section}Section`
    );
  });

  if (section === "analytics") {
    applyFiltersAndRender();
  }

  if (section === "reels") {
    renderReelList();
  }
}


// ============================================================
// LOAD ADMIN DATA
// ============================================================

async function loadAdminData() {
  showLoading(true);

  try {
    await Promise.all([
      loadReels(),
      loadResponses()
    ]);

    populateReelFilters();
    applyFiltersAndRender();
    renderReelList();

  } catch (error) {
    console.error("Admin data loading error:", error);

    showToast(
      "Unable to load dashboard data. Check Firebase rules and connection.",
      "error"
    );
  } finally {
    showLoading(false);
  }
}


// ============================================================
// LOAD REELS
// ============================================================

async function loadReels() {
  const reelsSnapshot = await get(ref(db, "reels"));

  state.reels = reelsSnapshot.exists()
    ? reelsSnapshot.val()
    : {};
}


// ============================================================
// LOAD RESPONSES
// ============================================================

async function loadResponses() {
  const snapshot = await get(ref(db, "feedback_responses"));

  state.responses = snapshot.exists()
    ? snapshot.val()
    : {};
}


// ============================================================
// FLATTEN RESPONSES
// ============================================================

function flattenResponses() {
  const result = [];

  Object.entries(state.responses || {}).forEach(
    ([reelId, reelResponses]) => {

      if (!reelResponses || typeof reelResponses !== "object") {
        return;
      }

      Object.entries(reelResponses).forEach(
        ([responseId, response]) => {

          if (!response || typeof response !== "object") {
            return;
          }

          result.push({
            ...response,
            reelId,
            responseId
          });
        }
      );
    }
  );

  return result;
}


// ============================================================
// FILTERS
// ============================================================

function bindFilters() {
  $("#reelFilter")?.addEventListener("change", (event) => {
    state.selectedReel = event.target.value;
    applyFiltersAndRender();
  });

  $("#ratingFilter")?.addEventListener("change", (event) => {
    state.selectedRating = event.target.value;
    applyFiltersAndRender();
  });

  $("#periodFilter")?.addEventListener("change", (event) => {
    state.selectedPeriod = event.target.value;
    applyFiltersAndRender();
  });
}


function populateReelFilters() {
  const select = $("#reelFilter");

  if (!select) return;

  const previous = state.selectedReel;

  select.innerHTML = `
    <option value="all">All Reels</option>
  `;

  Object.entries(state.reels || {})
    .sort((a, b) => {
      return reelNumber(a[0]) - reelNumber(b[0]);
    })
    .forEach(([reelId, reel]) => {

      const option = document.createElement("option");

      option.value = reelId;

      option.textContent =
        `${reelId} — ${reel?.title || "Untitled Reel"}`;

      select.appendChild(option);
    });

  if (
    previous === "all" ||
    state.reels[previous]
  ) {
    select.value = previous;
  } else {
    select.value = "all";
    state.selectedReel = "all";
  }
}


function applyFiltersAndRender() {
  const responses = flattenResponses();

  state.filteredResponses = responses.filter((response) => {

    if (
      state.selectedReel !== "all" &&
      response.reelId !== state.selectedReel
    ) {
      return false;
    }

    if (
      state.selectedRating !== "all" &&
      response.answers?.Q_RATING !== state.selectedRating
    ) {
      return false;
    }

    if (
      !passesPeriodFilter(
        response.submitted_at,
        state.selectedPeriod
      )
    ) {
      return false;
    }

    return true;
  });

  renderAnalytics();
}


// ============================================================
// DATE FILTER
// ============================================================

function passesPeriodFilter(timestamp, period) {
  if (period === "all") return true;

  if (!timestamp) return false;

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  if (period === "today") {
    return date.toDateString() === now.toDateString();
  }

  if (period === "7") {
    return date >= subtractDays(now, 7);
  }

  if (period === "30") {
    return date >= subtractDays(now, 30);
  }

  if (period === "90") {
    return date >= subtractDays(now, 90);
  }

  return true;
}


function subtractDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}


// ============================================================
// ANALYTICS
// ============================================================

function renderAnalytics() {
  const responses = state.filteredResponses;

  renderKPIs(responses);
  renderFeelingChart(responses);
  renderMoreContentChart(responses);
  renderConnectionChart(responses);
  renderRatingChart(responses);
  renderReelComparison();
  renderWrittenFeedback(responses);
}


// ============================================================
// KPI CARDS
// ============================================================

function renderKPIs(responses) {
  const total = responses.length;

  const ratings = responses
    .map((response) => ratingNumber(response.answers?.Q_RATING))
    .filter(Boolean);

  const averageRating = ratings.length
    ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    : 0;

  const feelingCounts = countValues(
    responses,
    (response) => response.answers?.Q_FEELING
  );

  const topFeelingId = getTopKey(feelingCounts);

  const positiveMoreContent = responses.filter(
    (response) =>
      response.answers?.Q_MORE_CONTENT === "MORE_DEFINITELY"
  ).length;

  const moreContentPercentage = total
    ? (positiveMoreContent / total) * 100
    : 0;

  setText(
    "#totalResponses",
    formatNumber(total)
  );

  setText(
    "#averageRating",
    averageRating ? averageRating.toFixed(1) : "—"
  );

  setText(
    "#topFeeling",
    topFeelingId
      ? FEELING_LABELS[topFeelingId] || topFeelingId
      : "—"
  );

  setText(
    "#moreContentPercentage",
    `${Math.round(moreContentPercentage)}%`
  );
}


// ============================================================
// FEELING CHART
// ============================================================

function renderFeelingChart(responses) {
  const counts = countValues(
    responses,
    (response) => response.answers?.Q_FEELING
  );

  renderBarChart(
    "#feelingChart",
    counts,
    FEELING_LABELS
  );
}


// ============================================================
// MORE CONTENT CHART
// ============================================================

function renderMoreContentChart(responses) {
  const counts = countValues(
    responses,
    (response) => response.answers?.Q_MORE_CONTENT
  );

  renderBarChart(
    "#moreContentChart",
    counts,
    MORE_CONTENT_LABELS
  );
}


// ============================================================
// CONNECTION CHART
// ============================================================

function renderConnectionChart(responses) {
  const counts = countValues(
    responses,
    (response) => response.answers?.Q_CONNECTION
  );

  renderBarChart(
    "#connectionChart",
    counts,
    CONNECTION_LABELS
  );
}


// ============================================================
// RATING CHART
// ============================================================

function renderRatingChart(responses) {
  const counts = countValues(
    responses,
    (response) => response.answers?.Q_RATING
  );

  renderBarChart(
    "#ratingChart",
    counts,
    RATING_LABELS
  );
}


// ============================================================
// GENERIC BAR CHART
// ============================================================

function renderBarChart(
  selector,
  counts,
  labels = {}
) {
  const container = $(selector);

  if (!container) return;

  container.innerHTML = "";

  const entries = Object.entries(counts);

  if (!entries.length) {
    container.innerHTML = emptyState("No data available");
    return;
  }

  const max = Math.max(
    ...entries.map(([, value]) => value),
    1
  );

  entries.forEach(([key, count]) => {

    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("div");
    label.className = "chart-label";
    label.textContent = labels[key] || key;

    const track = document.createElement("div");
    track.className = "chart-track";

    const bar = document.createElement("div");
    bar.className = "chart-bar";

    bar.style.width =
      `${Math.max((count / max) * 100, 2)}%`;

    const value = document.createElement("span");
    value.className = "chart-value";
    value.textContent = count;

    track.appendChild(bar);

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);

    container.appendChild(row);
  });
}


// ============================================================
// REEL COMPARISON
// ============================================================

function renderReelComparison() {
  const container = $("#reelComparisonBody");

  if (!container) return;

  container.innerHTML = "";

  const responses = flattenResponses();

  const grouped = {};

  responses.forEach((response) => {

    if (!grouped[response.reelId]) {
      grouped[response.reelId] = [];
    }

    grouped[response.reelId].push(response);
  });

  const reelIds = Object.keys(state.reels || {});

  if (!reelIds.length) {
    container.innerHTML = `
      <tr>
        <td colspan="5">
          No reels have been added yet.
        </td>
      </tr>
    `;
    return;
  }

  reelIds
    .sort((a, b) => reelNumber(a) - reelNumber(b))
    .forEach((reelId) => {

      const reelResponses = grouped[reelId] || [];

      const ratings = reelResponses
        .map((response) =>
          ratingNumber(response.answers?.Q_RATING)
        )
        .filter(Boolean);

      const average =
        ratings.length
          ? ratings.reduce((a, b) => a + b, 0) /
            ratings.length
          : 0;

      const topFeeling =
        getTopKey(
          countValues(
            reelResponses,
            (response) =>
              response.answers?.Q_FEELING
          )
        );

      const positive =
        reelResponses.filter(
          (response) =>
            response.answers?.Q_MORE_CONTENT ===
            "MORE_DEFINITELY"
        ).length;

      const percentage =
        reelResponses.length
          ? Math.round(
              (positive / reelResponses.length) * 100
            )
          : 0;

      const reel = state.reels[reelId];

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>
          <strong>${escapeHtml(reelId)}</strong>
        </td>

        <td>
          ${escapeHtml(
            reel?.title || "Untitled Reel"
          )}
        </td>

        <td>
          ${reelResponses.length}
        </td>

        <td>
          ${average ? average.toFixed(1) : "—"}
        </td>

        <td>
          ${
            topFeeling
              ? escapeHtml(
                  FEELING_LABELS[topFeeling] ||
                  topFeeling
                )
              : "—"
          }
        </td>

        <td>
          ${percentage}%
        </td>
      `;

      container.appendChild(row);
    });
}


// ============================================================
// WRITTEN FEEDBACK
// ============================================================

function renderWrittenFeedback(responses) {
  const container = $("#writtenFeedbackList");

  if (!container) return;

  container.innerHTML = "";

  const feedback = responses
    .filter(
      (response) =>
        response.answers?.Q_OPEN_FEEDBACK &&
        String(
          response.answers.Q_OPEN_FEEDBACK
        ).trim()
    )
    .sort(
      (a, b) =>
        Number(b.submitted_at || 0) -
        Number(a.submitted_at || 0)
    );

  if (!feedback.length) {
    container.innerHTML =
      emptyState("No written feedback available.");
    return;
  }

  feedback.forEach((response) => {

    const item = document.createElement("article");
    item.className = "feedback-item";

    const reel = state.reels[response.reelId];

    const date = formatDate(
      response.submitted_at
    );

    item.innerHTML = `
      <div class="feedback-item-header">

        <div>
          <strong>
            ${escapeHtml(
              response.user?.name ||
              "Anonymous"
            )}
          </strong>

          <span>
            ${escapeHtml(response.reelId)}
            ${
              reel?.title
                ? ` — ${escapeHtml(reel.title)}`
                : ""
            }
          </span>
        </div>

        <time>
          ${escapeHtml(date)}
        </time>

      </div>

      <p>
        ${escapeHtml(
          response.answers.Q_OPEN_FEEDBACK
        )}
      </p>
    `;

    container.appendChild(item);
  });
}


// ============================================================
// REEL MANAGEMENT
// ============================================================

function bindReelManagement() {
  $("#reelUrlForm")?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      await createReel();
    }
  );

  $("#copyFeedbackUrl")?.addEventListener(
    "click",
    async () => {
      const url = state.currentFeedbackUrl;

      if (!url) {
        showToast(
          "Generate a Reel first.",
          "error"
        );
        return;
      }

      const copied = await copyToClipboard(url);

      if (copied) {
        showToast(
          "Feedback URL copied.",
          "success"
        );
      } else {
        showToast(
          "Unable to copy the URL.",
          "error"
        );
      }
    }
  );
}


async function createReel() {
  const input = $("#facebookReelUrl");

  if (!input) return;

  const facebookUrl = input.value.trim();

  if (!isValidFacebookUrl(facebookUrl)) {
    showToast(
      "Enter a valid Facebook Reel URL.",
      "error"
    );
    return;
  }

  setButtonLoading("#createReelButton", true);
  showLoading(true);

  try {

    const reelId =
      await generateNextReelId();

    const feedbackUrl =
      buildFeedbackUrl(reelId);

    let metadata = {
      title: "",
      thumbnail: ""
    };

    if (METADATA_ENDPOINT) {
      metadata =
        await fetchReelMetadata(
          facebookUrl
        );
    }

    const reelData = {
      title:
        metadata.title ||
        "",

      facebookUrl,

      thumbnail:
        metadata.thumbnail ||
        "",

      feedbackUrl,

      createdAt:
        serverTimestamp()
    };

    await set(
      ref(db, `reels/${reelId}`),
      reelData
    );

    state.reels[reelId] = {
      ...reelData,
      createdAt: Date.now()
    };

    state.currentGeneratedReelId =
      reelId;

    state.currentFeedbackUrl =
      feedbackUrl;

    displayGeneratedReel(
      reelId,
      reelData
    );

    input.value = "";

    populateReelFilters();
    renderReelList();

    showToast(
      `${reelId} created successfully.`,
      "success"
    );

  } catch (error) {

    console.error(
      "Create reel error:",
      error
    );

    showToast(
      "Unable to create the Reel.",
      "error"
    );

  } finally {
    setButtonLoading(
      "#createReelButton",
      false
    );

    showLoading(false);
  }
}


// ============================================================
// REEL ID GENERATION
// ============================================================

async function generateNextReelId() {
  // Re-read the reels node so the ID is based on
  // the latest database state.

  const snapshot =
    await get(ref(db, "reels"));

  const reels =
    snapshot.exists()
      ? snapshot.val()
      : {};

  let highestNumber = 0;

  Object.keys(reels).forEach((id) => {
    const number = reelNumber(id);

    if (number > highestNumber) {
      highestNumber = number;
    }
  });

  return `RB${String(highestNumber + 1).padStart(3, "0")}`;
}


function reelNumber(id) {
  if (!id) return 0;

  const match =
    String(id).match(/^RB(\d+)$/i);

  return match
    ? Number(match[1])
    : 0;
}


// ============================================================
// FACEBOOK URL VALIDATION
// ============================================================

function isValidFacebookUrl(value) {
  try {
    const url = new URL(value);

    const hostname =
      url.hostname.toLowerCase();

    return (
      hostname === "facebook.com" ||
      hostname === "www.facebook.com" ||
      hostname === "m.facebook.com" ||
      hostname === "fb.watch" ||
      hostname.endsWith(".facebook.com")
    );

  } catch {
    return false;
  }
}


// ============================================================
// OPTIONAL METADATA ENDPOINT
// ============================================================

async function fetchReelMetadata(
  facebookUrl
) {
  if (!METADATA_ENDPOINT) {
    return {
      title: "",
      thumbnail: ""
    };
  }

  const response =
    await fetch(
      `${METADATA_ENDPOINT}?url=${encodeURIComponent(
        facebookUrl
      )}`
    );

  if (!response.ok) {
    throw new Error(
      "Metadata request failed."
    );
  }

  const data =
    await response.json();

  return {
    title:
      typeof data.title === "string"
        ? data.title.trim()
        : "",

    thumbnail:
      typeof data.thumbnail === "string"
        ? data.thumbnail.trim()
        : ""
  };
}


// ============================================================
// DISPLAY GENERATED REEL
// ============================================================

function displayGeneratedReel(
  reelId,
  reel
) {
  setText(
    "#generatedReelId",
    reelId
  );

  setInputValue(
    "#generatedFeedbackUrl",
    reel.feedbackUrl
  );

  setText(
    "#metadataTitle",
    reel.title || "Not available"
  );

  const thumbnail =
    $("#metadataThumbnail");

  if (thumbnail) {

    if (reel.thumbnail) {
      thumbnail.src =
        reel.thumbnail;

      thumbnail.classList.remove(
        "hidden"
      );
    } else {
      thumbnail.removeAttribute(
        "src"
      );

      thumbnail.classList.add(
        "hidden"
      );
    }
  }

  $("#generatedReelPreview")
    ?.classList.remove("hidden");
}


// ============================================================
// REEL LIST
// ============================================================

function renderReelList() {
  const container =
    $("#managedReelsList");

  if (!container) return;

  container.innerHTML = "";

  const entries =
    Object.entries(state.reels || {})
      .sort(
        (a, b) =>
          reelNumber(a[0]) -
          reelNumber(b[0])
      );

  if (!entries.length) {
    container.innerHTML =
      emptyState(
        "No Reels have been added yet."
      );

    return;
  }

  entries.forEach(
    ([reelId, reel]) => {

      const item =
        document.createElement(
          "article"
        );

      item.className =
        "managed-reel-item";

      const feedbackUrl =
        reel.feedbackUrl ||
        buildFeedbackUrl(reelId);

      item.innerHTML = `
        <div class="managed-reel-main">

          <div class="managed-reel-id">
            ${escapeHtml(reelId)}
          </div>

          <div class="managed-reel-info">

            <h3>
              ${escapeHtml(
                reel.title ||
                "Untitled Facebook Reel"
              )}
            </h3>

            <p>
              ${escapeHtml(
                reel.facebookUrl ||
                ""
              )}
            </p>

            <div class="feedback-url">
              ${escapeHtml(
                feedbackUrl
              )}
            </div>

          </div>

        </div>

        <div class="managed-reel-actions">

          <button
            type="button"
            class="secondary-button copy-reel-url"
            data-url="${escapeHtml(
              feedbackUrl
            )}"
          >
            ${copyIcon()}
            <span>Copy Feedback URL</span>
          </button>

          <a
            class="secondary-button"
            href="${escapeHtml(
              reel.facebookUrl || "#"
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${externalLinkIcon()}
            <span>Open Reel</span>
          </a>

        </div>
      `;

      container.appendChild(item);
    }
  );

  $$(".copy-reel-url").forEach(
    (button) => {

      button.addEventListener(
        "click",
        async () => {

          const url =
            button.dataset.url;

          if (!url) return;

          const copied =
            await copyToClipboard(url);

          showToast(
            copied
              ? "Feedback URL copied."
              : "Unable to copy URL.",
            copied
              ? "success"
              : "error"
          );
        }
      );
    }
  );
}


// ============================================================
// FEEDBACK URL
// ============================================================

function buildFeedbackUrl(reelId) {
  const url =
    new URL(
      window.location.href
    );

  url.search = "";
  url.hash = "";

  url.searchParams.set(
    "reel",
    reelId
  );

  // The feedback page is the public index page.
  url.pathname =
    url.pathname
      .replace(
        /\/admin\.html$/i,
        "/index.html"
      )
      .replace(
        /\/admin\/?$/i,
        "/"
      );

  return url.toString();
}


// ============================================================
// COUNT HELPERS
// ============================================================

function countValues(
  responses,
  getter
) {
  const counts = {};

  responses.forEach((response) => {

    const value =
      getter(response);

    if (!value) return;

    counts[value] =
      (counts[value] || 0) + 1;
  });

  return counts;
}


function getTopKey(counts) {
  const entries =
    Object.entries(counts);

  if (!entries.length) {
    return null;
  }

  entries.sort(
    (a, b) => b[1] - a[1]
  );

  return entries[0][0];
}


// ============================================================
// RATING HELPERS
// ============================================================

function ratingNumber(value) {
  const match =
    String(value || "").match(
      /^RATING_(\d)$/
    );

  return match
    ? Number(match[1])
    : 0;
}


// ============================================================
// UI HELPERS
// ============================================================

function setText(
  selector,
  value
) {
  const element = $(selector);

  if (element) {
    element.textContent =
      value ?? "";
  }
}


function setInputValue(
  selector,
  value
) {
  const element = $(selector);

  if (element) {
    element.value =
      value ?? "";
  }
}


function formatNumber(value) {
  return Number(value || 0).toLocaleString(
    "en-IN"
  );
}


function formatDate(timestamp) {
  if (!timestamp) {
    return "Unknown date";
  }

  const date =
    new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function emptyState(message) {
  return `
    <div class="empty-state">
      ${escapeHtml(message)}
    </div>
  `;
}


// ============================================================
// LOADING
// ============================================================

function showLoading(show) {
  const overlay =
    $("#loadingOverlay");

  if (!overlay) return;

  overlay.classList.toggle(
    "hidden",
    !show
  );
}


function setButtonLoading(
  selector,
  loading
) {
  const button =
    $(selector);

  if (!button) return;

  button.disabled =
    loading;

  button.classList.toggle(
    "loading",
    loading
  );
}


// ============================================================
// TOAST
// ============================================================

let toastTimer = null;

function showToast(
  message,
  type = "info"
) {
  const toast =
    $("#toast");

  if (!toast) return;

  toast.textContent =
    message;

  toast.dataset.type =
    type;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(() => {
      toast.classList.remove(
        "show"
      );
    }, 3000);
}


// ============================================================
// CLIPBOARD
// ============================================================

async function copyToClipboard(
  text
) {
  try {

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        text
      );

      return true;
    }

    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value =
      text;

    textarea.style.position =
      "fixed";

    textarea.style.opacity =
      "0";

    document.body.appendChild(
      textarea
    );

    textarea.focus();
    textarea.select();

    const success =
      document.execCommand(
        "copy"
      );

    textarea.remove();

    return success;

  } catch (error) {
    console.error(
      "Clipboard error:",
      error
    );

    return false;
  }
}


// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// SVG ICONS
// ============================================================

function eyeIcon() {
  return `
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/>
      <circle cx="12" cy="12" r="2.5"/>
    </svg>
  `;
}


function eyeOffIcon() {
  return `
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m3 3 18 18"/>
      <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a17.5 17.5 0 0 1-3.1 3.5"/>
      <path d="M6.1 6.1C3.5 8.1 2 12 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.9-.8"/>
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
    </svg>
  `;
}


function copyIcon() {
  return `
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2"/>
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>
    </svg>
  `;
}


function externalLinkIcon() {
  return `
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h6v6"/>
      <path d="M10 14 20 4"/>
      <path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"/>
    </svg>
  `;
}
