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


/* =====================================================
   FIREBASE CONFIG
===================================================== */

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


const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getDatabase(app);


/* =====================================================
   DOM
===================================================== */

const loginScreen =
  document.getElementById("loginScreen");

const dashboardScreen =
  document.getElementById("dashboardScreen");

const loginForm =
  document.getElementById("loginForm");

const emailInput =
  document.getElementById("emailInput");

const passwordInput =
  document.getElementById("passwordInput");

const loginError =
  document.getElementById("loginError");

const logoutBtn =
  document.getElementById("logoutBtn");

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

const saveReelBtn =
  document.getElementById("saveReelBtn");

const reelFormMessage =
  document.getElementById("reelFormMessage");

const reelList =
  document.getElementById("reelList");


/* =====================================================
   STATE
===================================================== */

let reelsData = {};
let feedbackData = {};

let editingReelId = null;
let fetchedMetadata = null;


/* =====================================================
   AUTH — LOGIN
===================================================== */

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    loginError.textContent = "";

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;


    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      loginError.textContent =
        getAuthErrorMessage(
          error.code
        );
    }
  }
);


/* =====================================================
   AUTH STATE
===================================================== */

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      loginScreen.classList.remove(
        "hidden"
      );

      dashboardScreen.classList.add(
        "hidden"
      );

      return;
    }


    if (user.uid !== ADMIN_UID) {

      await signOut(auth);

      loginScreen.classList.remove(
        "hidden"
      );

      dashboardScreen.classList.add(
        "hidden"
      );

      loginError.textContent =
        "This account is not authorized.";

      return;
    }


    loginScreen.classList.add(
      "hidden"
    );

    dashboardScreen.classList.remove(
      "hidden"
    );


    await loadDashboard();
  }
);


/* =====================================================
   LOGOUT
===================================================== */

logoutBtn.addEventListener(
  "click",
  async () => {

    const confirmed =
      window.confirm(
        "Are you sure you want to logout?"
      );


    if (!confirmed) {
      return;
    }


    try {

      await signOut(auth);

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

      window.alert(
        "Logout failed. Please try again."
      );
    }
  }
);


/* =====================================================
   AUTH ERROR
===================================================== */

function getAuthErrorMessage(code) {

  switch (code) {

    case "auth/invalid-credential":
      return "Invalid email or password.";

    case "auth/invalid-email":
      return "Please enter a valid email.";

    case "auth/user-disabled":
      return "This account has been disabled.";

    case "auth/too-many-requests":
      return "Too many login attempts. Try again later.";

    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";

    default:
      return "Login failed. Please check your details.";
  }
}


/* =====================================================
   NAVIGATION
===================================================== */

navButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        navButtons.forEach(
          (btn) =>
            btn.classList.remove(
              "active"
            )
        );


        button.classList.add(
          "active"
        );


        document
          .querySelectorAll(".admin-view")
          .forEach(
            (view) =>
              view.classList.add(
                "hidden"
              )
          );


        const target =
          document.getElementById(
            button.dataset.view
          );


        if (target) {
          target.classList.remove(
            "hidden"
          );
        }
      }
    );
  }
);


/* =====================================================
   DASHBOARD LOAD
===================================================== */

async function loadDashboard() {

  try {

    await loadReels();

    await loadFeedback();

    populateReelFilter();

    renderAnalytics();

  } catch (error) {

    console.error(
      "Dashboard loading error:",
      error
    );

    window.alert(
      "Unable to load feedback. Check Firebase Rules."
    );
  }
}


/* =====================================================
   LOAD REELS
===================================================== */

async function loadReels() {

  const snapshot =
    await get(
      ref(db, "reels")
    );


  reelsData =
    snapshot.exists()
      ? snapshot.val()
      : {};


  populateReelFilter();

  renderReelList();

  updateGeneratedReelId();
}


/* =====================================================
   LOAD ALL FEEDBACK
   NOTE:
   Firebase Rules must allow admin read at
   feedback_responses root.
===================================================== */

async function loadFeedback() {

  try {

    const snapshot =
      await get(
        ref(
          db,
          "feedback_responses"
        )
      );


    feedbackData =
      snapshot.exists()
        ? snapshot.val()
        : {};

  } catch (error) {

    console.error(
      "Feedback read error:",
      error
    );

    throw error;
  }
}


/* =====================================================
   AUTO REEL ID
===================================================== */

function getNextReelId() {

  const usedNumbers =
    Object.keys(reelsData)
      .map(
        (id) => {

          const match =
            /^RB(\d+)$/.exec(id);

          return match
            ? Number(match[1])
            : 0;
        }
      )
      .filter(
        (number) => number > 0
      );


  let nextNumber =
    usedNumbers.length
      ? Math.max(...usedNumbers) + 1
      : 1;


  let candidate;


  do {

    candidate =
      `RB${String(nextNumber).padStart(3, "0")}`;

    nextNumber++;

  } while (
    reelsData[candidate]
  );


  return candidate;
}


function updateGeneratedReelId() {

  generatedReelId.textContent =
    editingReelId ||
    getNextReelId();
}


/* =====================================================
   FACEBOOK URL VALIDATION
===================================================== */

function isFacebookUrl(url) {

  try {

    const parsed =
      new URL(url);

    const host =
      parsed.hostname.toLowerCase();


    return (
      host === "facebook.com" ||
      host === "www.facebook.com" ||
      host.endsWith(".facebook.com")
    );

  } catch {

    return false;
  }
}


/* =====================================================
   METADATA
===================================================== */

async function fetchReelMetadata(url) {

  metadataStatus.textContent =
    "Fetching Reel information…";


  metadataStatus.style.color =
    "#555";


  fetchedMetadata = null;


  const endpoints = [

    `https://www.facebook.com/plugins/post/oembed.json?url=${encodeURIComponent(url)}`,

    `https://www.facebook.com/plugins/video/oembed.json?url=${encodeURIComponent(url)}`
  ];


  for (const endpoint of endpoints) {

    try {

      const response =
        await fetch(
          endpoint
        );


      if (!response.ok) {
        continue;
      }


      const data =
        await response.json();


      if (!data) {
        continue;
      }


      const title =
        data.title ||
        data.author_name ||
        null;


      const thumbnail =
        data.thumbnail_url ||
        "";


      if (title) {

        fetchedMetadata = {
          title,
          thumbnail
        };


        generatedTitle.textContent =
          title;


        metadataStatus.textContent =
          "Reel information detected.";

        metadataStatus.style.color =
          "#287a3e";


        return fetchedMetadata;
      }

    } catch (error) {

      console.warn(
        "Facebook metadata request failed:",
        error
      );
    }
  }


  /*
    Facebook may block browser-side metadata requests.
    We never invent a Facebook title.
  */

  const fallbackId =
    editingReelId ||
    getNextReelId();


  const fallbackTitle =
    `Rudra Bhakti Reel ${fallbackId}`;


  fetchedMetadata = {
    title: fallbackTitle,
    thumbnail: ""
  };


  generatedTitle.textContent =
    fallbackTitle;


  metadataStatus.textContent =
    "Facebook title could not be fetched automatically. A fallback title will be used.";

  metadataStatus.style.color =
    "#777";


  return fetchedMetadata;
}


/* =====================================================
   FETCH INFO BUTTON
===================================================== */

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


    fetchMetadataBtn.disabled =
      true;


    try {

      await fetchReelMetadata(
        url
      );

    } finally {

      fetchMetadataBtn.disabled =
        false;
    }
  }
);


/* =====================================================
   URL INPUT
===================================================== */

facebookUrlInput.addEventListener(
  "input",
  () => {

    fetchedMetadata = null;

    generatedTitle.textContent =
      "Waiting for URL…";

    metadataStatus.textContent =
      "";

    updateGeneratedReelId();
  }
);


/* =====================================================
   ADD / UPDATE REEL
===================================================== */

reelForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    reelFormMessage.textContent =
      "";


    const url =
      facebookUrlInput.value.trim();


    if (!isFacebookUrl(url)) {

      reelFormMessage.textContent =
        "Please enter a valid Facebook Reel URL.";

      reelFormMessage.style.color =
        "#c62828";

      return;
    }


    saveReelBtn.disabled =
      true;


    try {

      const reelId =
        editingReelId ||
        getNextReelId();


      /*
        Automatically attempt metadata
        if the admin didn't press Fetch.
      */

      if (!fetchedMetadata) {

        await fetchReelMetadata(
          url
        );
      }


      const title =
        fetchedMetadata?.title ||
        `Rudra Bhakti Reel ${reelId}`;


      const thumbnail =
        fetchedMetadata?.thumbnail ||
        "";


      const reelRef =
        ref(
          db,
          `reels/${reelId}`
        );


      const existingReel =
        reelsData[reelId];


      if (existingReel) {

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


      reelFormMessage.style.color =
        "#287a3e";


      await loadReels();


      resetReelForm();


    } catch (error) {

      console.error(
        "Reel save error:",
        error
      );


      reelFormMessage.textContent =
        "Could not save Reel. Check Firebase Rules.";

      reelFormMessage.style.color =
        "#c62828";

    } finally {

      saveReelBtn.disabled =
        false;
    }
  }
);


/* =====================================================
   RESET REEL FORM
===================================================== */

function resetReelForm() {

  editingReelId = null;

  fetchedMetadata = null;

  reelForm.reset();


  generatedTitle.textContent =
    "Waiting for URL…";


  metadataStatus.textContent =
    "";


  saveReelBtn.textContent =
    "Add Reel";


  updateGeneratedReelId();
}


/* =====================================================
   REEL FILTER
===================================================== */

reelFilter.addEventListener(
  "change",
  () => {

    renderAnalytics();
  }
);


function populateReelFilter() {

  const previous =
    reelFilter.value;


  reelFilter.innerHTML =
    `<option value="ALL">All Reels</option>`;


  Object.keys(reelsData)
    .sort()
    .forEach(
      (id) => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          id;


        option.textContent =
          `${id} — ${
            reelsData[id].title ||
            "Untitled"
          }`;


        reelFilter.appendChild(
          option
        );
      }
    );


  if (
    previous === "ALL" ||
    reelsData[previous]
  ) {

    reelFilter.value =
      previous;
  }
}


/* =====================================================
   REEL LIST
===================================================== */

function renderReelList() {

  const ids =
    Object.keys(
      reelsData
    ).sort();


  if (!ids.length) {

    reelList.innerHTML =
      `<p class="empty-state">
        No Reels added yet.
      </p>`;

    return;
  }


  reelList.innerHTML =
    ids
      .map(
        (id) => {

          const reel =
            reelsData[id];


          const feedbackLink =
            `${window.location.origin}${window.location.pathname.replace(
              /admin\.html$/,
              ""
            )}?reel=${encodeURIComponent(id)}`;


          return `
            <div class="reel-item">

              <div class="reel-info">

                <strong>
                  ${escapeHTML(id)}
                  —
                  ${escapeHTML(
                    reel.title ||
                    "Untitled"
                  )}
                </strong>

                <small>
                  ${escapeHTML(
                    reel.facebookUrl ||
                    ""
                  )}
                </small>

              </div>


              <div class="reel-actions">

                <button
                  type="button"
                  class="small-btn"
                  data-action="copy"
                  data-id="${escapeHTML(id)}"
                  data-link="${escapeHTML(feedbackLink)}"
                >
                  Copy Link
                </button>


                <button
                  type="button"
                  class="small-btn"
                  data-action="edit"
                  data-id="${escapeHTML(id)}"
                >
                  Edit
                </button>


                <button
                  type="button"
                  class="small-btn"
                  data-action="delete"
                  data-id="${escapeHTML(id)}"
                >
                  Delete
                </button>

              </div>

            </div>
          `;
        }
      )
      .join("");


  reelList
    .querySelectorAll("button")
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          async () => {

            const action =
              button.dataset.action;

            const id =
              button.dataset.id;


            if (
              action === "copy"
            ) {

              await copyFeedbackLink(
                button,
                button.dataset.link
              );

              return;
            }


            if (
              action === "edit"
            ) {

              editReel(id);

              return;
            }


            if (
              action === "delete"
            ) {

              await deleteReel(id);
            }
          }
        );
      }
    );
}


/* =====================================================
   COPY FEEDBACK LINK
===================================================== */

async function copyFeedbackLink(
  button,
  link
) {

  try {

    await navigator.clipboard.writeText(
      link
    );


    const oldText =
      button.textContent;


    button.textContent =
      "Copied!";


    setTimeout(
      () => {
        button.textContent =
          oldText;
      },
      1500
    );

  } catch (error) {

    console.error(
      "Copy failed:",
      error
    );


    window.prompt(
      "Copy this feedback link:",
      link
    );
  }
}


/* =====================================================
   EDIT REEL
===================================================== */

function editReel(id) {

  const reel =
    reelsData[id];


  if (!reel) {
    return;
  }


  editingReelId =
    id;


  facebookUrlInput.value =
    reel.facebookUrl ||
    "";


  generatedReelId.textContent =
    id;


  generatedTitle.textContent =
    reel.title ||
    "Untitled";


  fetchedMetadata = {
    title:
      reel.title ||
      `Rudra Bhakti Reel ${id}`,

    thumbnail:
      reel.thumbnail ||
      ""
  };


  saveReelBtn.textContent =
    "Update Reel";


  metadataStatus.textContent =
    "Editing existing Reel.";


  metadataStatus.style.color =
    "#666";


  navButtons.forEach(
    (button) =>
      button.classList.remove(
        "active"
      )
  );


  const addButton =
    document.querySelector(
      '[data-view="addReelView"]'
    );


  if (addButton) {
    addButton.classList.add(
      "active"
    );
  }


  document
    .querySelectorAll(".admin-view")
    .forEach(
      (view) =>
        view.classList.add(
          "hidden"
        )
    );


  document
    .getElementById(
      "addReelView"
    )
    .classList.remove(
      "hidden"
    );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =====================================================
   DELETE REEL
===================================================== */

async function deleteReel(id) {

  const confirmed =
    window.confirm(
      `Delete ${id} from the Reel list?\n\nExisting feedback responses will NOT be deleted.`
    );


  if (!confirmed) {
    return;
  }


  try {

    await remove(
      ref(
        db,
        `reels/${id}`
      )
    );


    delete reelsData[id];


    populateReelFilter();

    renderReelList();

    renderAnalytics();

    updateGeneratedReelId();


  } catch (error) {

    console.error(
      "Delete error:",
      error
    );


    window.alert(
      "Could not delete Reel."
    );
  }
}


/* =====================================================
   ANALYTICS
===================================================== */

function getFilteredResponses() {

  const selected =
    reelFilter.value;


  const responses = [];


  Object.entries(
    feedbackData
  ).forEach(
    ([reelId, reelResponses]) => {

      if (
        selected !== "ALL" &&
        reelId !== selected
      ) {
        return;
      }


      Object.values(
        reelResponses || {}
      ).forEach(
        (response) => {

          responses.push({
            reelId,
            ...response
          });
        }
      );
    }
  );


  return responses;
}


function renderAnalytics() {

  const responses =
    getFilteredResponses();


  document.getElementById(
    "totalResponses"
  ).textContent =
    responses.length;


  renderAverageRating(
    responses
  );


  renderWantMore(
    responses
  );


  renderTopFeeling(
    responses
  );


  renderDistribution(
    responses,
    "Q_FEELING",
    "feelingDistribution",
    {
      FEEL_PEACEFUL:
        "Peaceful",

      FEEL_DEVOTIONAL:
        "Devotional",

      FEEL_EMOTIONAL:
        "Emotional",

      FEEL_INSPIRED:
        "Inspired",

      FEEL_CALM:
        "Calm",

      FEEL_DEEPLY_MOVED:
        "Deeply Moved"
    }
  );


  renderDistribution(
    responses,
    "Q_MORE_CONTENT",
    "moreDistribution",
    {
      MORE_DEFINITELY:
        "Definitely",

      MORE_SOMETIMES:
        "Sometimes",

      MORE_UNSURE:
        "Unsure",

      MORE_NOT_REALLY:
        "Not Really"
    }
  );


  renderDistribution(
    responses,
    "Q_CONNECTION",
    "connectionDistribution",
    {
      CONNECT_SHIVA_PARVATI:
        "Shiva & Parvati",

      CONNECT_DEVOTIONAL_FEELING:
        "Devotional Feeling",

      CONNECT_ARTWORK:
        "Artwork",

      CONNECT_MUSIC:
        "Music",

      CONNECT_EVERYTHING:
        "Everything"
    }
  );


  renderDistribution(
    responses,
    "Q_RATING",
    "ratingDistribution",
    {
      RATING_1:
        "1 Star",

      RATING_2:
        "2 Stars",

      RATING_3:
        "3 Stars",

      RATING_4:
        "4 Stars",

      RATING_5:
        "5 Stars"
    }
  );


  renderWrittenFeedback(
    responses
  );
}


/* =====================================================
   AVERAGE RATING
===================================================== */

function renderAverageRating(
  responses
) {

  const ratings =
    responses
      .map(
        (response) =>
          ratingNumber(
            response.answers?.Q_RATING
          )
      )
      .filter(
        (number) =>
          number > 0
      );


  const average =
    ratings.length
      ? ratings.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / ratings.length
      : 0;


  document.getElementById(
    "averageRating"
  ).textContent =
    average.toFixed(1);
}


function ratingNumber(
  value
) {

  const match =
    /^RATING_(\d)$/.exec(
      value || ""
    );


  return match
    ? Number(match[1])
    : 0;
}


/* =====================================================
   WANT MORE
===================================================== */

function renderWantMore(
  responses
) {

  const total =
    responses.length;


  if (!total) {

    document.getElementById(
      "wantMore"
    ).textContent =
      "0%";

    return;
  }


  const definitely =
    responses.filter(
      (response) =>
        response.answers?.Q_MORE_CONTENT ===
        "MORE_DEFINITELY"
    ).length;


  const percentage =
    (definitely / total) * 100;


  document.getElementById(
    "wantMore"
  ).textContent =
    `${percentage.toFixed(0)}%`;
}


/* =====================================================
   TOP FEELING
===================================================== */

function renderTopFeeling(
  responses
) {

  const counts = {};


  responses.forEach(
    (response) => {

      const value =
        response.answers?.Q_FEELING;


      if (value) {

        counts[value] =
          (counts[value] || 0) + 1;
      }
    }
  );


  const labels = {
    FEEL_PEACEFUL:
      "Peaceful",

    FEEL_DEVOTIONAL:
      "Devotional",

    FEEL_EMOTIONAL:
      "Emotional",

    FEEL_INSPIRED:
      "Inspired",

    FEEL_CALM:
      "Calm",

    FEEL_DEEPLY_MOVED:
      "Deeply Moved"
  };


  const top =
    Object.entries(counts)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )[0];


  document.getElementById(
    "topFeeling"
  ).textContent =
    top
      ? labels[top[0]] ||
        top[0]
      : "—";
}


/* =====================================================
   DISTRIBUTION
===================================================== */

function renderDistribution(
  responses,
  answerKey,
  elementId,
  labels
) {

  const container =
    document.getElementById(
      elementId
    );


  const counts = {};


  Object.keys(labels)
    .forEach(
      (id) => {
        counts[id] = 0;
      }
    );


  responses.forEach(
    (response) => {

      const value =
        response.answers?.[
          answerKey
        ];


      if (
        value &&
        Object.prototype.hasOwnProperty.call(
          counts,
          value
        )
      ) {

        counts[value]++;
      }
    }
  );


  const total =
    responses.length;


  container.innerHTML =
    Object.entries(labels)
      .map(
        ([id, label]) => {

          const count =
            counts[id] || 0;


          const percentage =
            total
              ? (count / total) * 100
              : 0;


          return `
            <div class="distribution-row">

              <div class="distribution-label">

                <span>
                  ${escapeHTML(label)}
                </span>

                <span>
                  ${count}
                  ·
                  ${percentage.toFixed(0)}%
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
        }
      )
      .join("");
}


/* =====================================================
   WRITTEN FEEDBACK
===================================================== */

function renderWrittenFeedback(
  responses
) {

  const container =
    document.getElementById(
      "writtenFeedback"
    );


  const written =
    responses.filter(
      (response) =>
        response.answers?.Q_OPEN_FEEDBACK &&
        response.answers.Q_OPEN_FEEDBACK.trim()
    );


  if (!written.length) {

    container.innerHTML =
      `<p class="empty-state">
        No written feedback yet.
      </p>`;

    return;
  }


  container.innerHTML =
    written
      .slice()
      .reverse()
      .map(
        (response) => {

          const reelTitle =
            reelsData[
              response.reelId
            ]?.title ||
            response.reelId;


          return `
            <div class="feedback-item">

              <p>
                ${escapeHTML(
                  response.answers
                    .Q_OPEN_FEEDBACK
                )}
              </p>

              <small>
                ${escapeHTML(
                  response.reelId
                )}
                —
                ${escapeHTML(
                  reelTitle
                )}
              </small>

            </div>
          `;
        }
      )
      .join("");
}


/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
