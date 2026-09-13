/* =========================================================
   RUDRA BHAKTI — ADMIN DASHBOARD
   js/admin.js
   Firebase Authentication + Realtime Database
   ========================================================= */

import {
  auth,
  db
} from "./firebase.js";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  ref,
  get,
  set,
  update,
  push,
  query,
  orderByChild,
  limitToLast,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";


/* =========================================================
   CONFIG
   ========================================================= */

const ADMIN_UID =
  "CEozlrvQkuMUox2gKTlQOzdc3ZS2";


/* =========================================================
   STATE
   ========================================================= */

const state = {
  reels: [],
  feedback: [],
  selectedReelId: "all",
  currentSection: "overview"
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(selector) {
  return document.querySelector(
    selector
  );
}

function $$(selector) {
  return [
    ...document.querySelectorAll(
      selector
    )
  ];
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupNavigation();
    setupLogin();
    setupReelManager();
    setupResponseFilters();
    setupLogout();

    listenForAuth();
  }
);


/* =========================================================
   AUTH STATE
   ========================================================= */

function listenForAuth() {

  onAuthStateChanged(
    auth,
    async (user) => {

      if (!user) {
        showLogin();
        return;
      }


      /*
       * Extra UID protection.
       */
      if (
        user.uid !== ADMIN_UID
      ) {
        console.warn(
          "Unauthorized admin UID:",
          user.uid
        );

        await signOut(auth);

        showLoginError(
          "This account is not authorized as an administrator."
        );

        return;
      }


      showAdmin();

      await loadDashboard();
    }
  );
}


/* =========================================================
   LOGIN
   ========================================================= */

function setupLogin() {

  const form =
    $(
      "#loginForm"
    ) ||
    $(
      "[data-login-form]"
    );


  if (!form) {
    return;
  }


  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const email =
        $(
          "#email"
        )?.value.trim() ||
        $(
          "[name='email']"
        )?.value.trim();


      const password =
        $(
          "#password"
        )?.value ||
        $(
          "[name='password']"
        )?.value;


      if (
        !email ||
        !password
      ) {
        showLoginError(
          "Please enter your email and password."
        );

        return;
      }


      try {

        setLoginLoading(
          true
        );


        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );


      } catch (error) {

        console.error(
          "Admin login failed:",
          error
        );


        showLoginError(
          getAuthErrorMessage(
            error
          )
        );


      } finally {

        setLoginLoading(
          false
        );
      }
    }
  );
}


/* =========================================================
   AUTH ERROR
   ========================================================= */

function getAuthErrorMessage(
  error
) {

  switch (
    error?.code
  ) {

    case "auth/invalid-credential":
      return "Invalid email or password.";

    case "auth/user-not-found":
      return "Admin account not found.";

    case "auth/wrong-password":
      return "Invalid email or password.";

    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    default:
      return "Unable to sign in. Please try again.";
  }
}


/* =========================================================
   LOGIN UI
   ========================================================= */

function showLogin() {

  const login =
    $(
      "#loginScreen"
    ) ||
    $(
      "[data-login-screen]"
    );

  const dashboard =
    $(
      "#adminDashboard"
    ) ||
    $(
      "[data-admin-dashboard]"
    );


  if (login) {
    login.style.display =
      "";
  }

  if (dashboard) {
    dashboard.style.display =
      "none";
  }
}


function showAdmin() {

  const login =
    $(
      "#loginScreen"
    ) ||
    $(
      "[data-login-screen]"
    );

  const dashboard =
    $(
      "#adminDashboard"
    ) ||
    $(
      "[data-admin-dashboard]"
    );


  if (login) {
    login.style.display =
      "none";
  }

  if (dashboard) {
    dashboard.style.display =
      "";
  }
}


function setLoginLoading(
  loading
) {

  const button =
    $(
      "#loginForm button[type='submit']"
    );


  if (!button) {
    return;
  }


  button.disabled =
    loading;

  button.textContent =
    loading
      ? "Signing in..."
      : "Sign In";
}


function showLoginError(
  message
) {

  const element =
    $(
      "#loginError"
    ) ||
    $(
      "[data-login-error]"
    );


  if (element) {
    element.textContent =
      message;

    element.style.display =
      "block";
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

  $$(
    "[data-logout], #logoutBtn"
  ).forEach(
    (button) => {

      button.addEventListener(
        "click",
        async () => {

          try {
            await signOut(
              auth
            );
          } catch (error) {
            console.error(
              error
            );
          }

        }
      );

    }
  );
}


/* =========================================================
   LOAD DASHBOARD
   ========================================================= */

async function loadDashboard() {

  try {

    await loadReels();

    await loadFeedback();

    renderOverview();

    renderReelLibrary();

    renderResponses();

    renderPsychology();

    renderUXAnalytics();

    renderTimingAnalytics();

    renderTypingAnalytics();

  } catch (error) {

    console.error(
      "Dashboard loading error:",
      error
    );

    showDashboardError(
      "Unable to load dashboard data."
    );
  }
}


/* =========================================================
   REELS
   ========================================================= */

async function loadReels() {

  const snapshot =
    await get(
      ref(db, "reels")
    );


  if (!snapshot.exists()) {

    state.reels = [];

    return;
  }


  const data =
    snapshot.val();


  state.reels =
    Object.entries(data)
      .map(
        ([id, reel]) => ({
          id,
          ...reel
        })
      )
      .sort(
        (a, b) =>
          String(
            a.reelId
          ).localeCompare(
            String(
              b.reelId
            )
          )
      );
}


/* =========================================================
   AUTOMATIC REEL ID
   ========================================================= */

function generateNextReelId() {

  let highest =
    0;


  state.reels.forEach(
    (reel) => {

      const match =
        String(
          reel.reelId ||
          reel.id ||
          ""
        ).match(
          /^RB(\d+)$/
        );


      if (match) {

        const number =
          Number(
            match[1]
          );

        if (
          number >
          highest
        ) {
          highest =
            number;
        }
      }
    }
  );


  return (
    "RB" +
    String(
      highest + 1
    ).padStart(
      4,
      "0"
    )
  );
}


/* =========================================================
   REEL MANAGER
   ========================================================= */

function setupReelManager() {

  const form =
    $(
      "#addReelForm"
    ) ||
    $(
      "[data-add-reel-form]"
    );


  if (!form) {
    return;
  }


  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const url =
        $(
          "#reelUrl"
        )?.value.trim() ||
        $(
          "[name='reelUrl']"
        )?.value.trim();


      const title =
        $(
          "#reelTitle"
        )?.value.trim() ||
        $(
          "[name='reelTitle']"
        )?.value.trim();


      const thumbnail =
        $(
          "#reelThumbnail"
        )?.value.trim() ||
        $(
          "[name='thumbnailUrl']"
        )?.value.trim();


      if (!url) {

        showAdminMessage(
          "Please enter the Facebook Reel URL.",
          "error"
        );

        return;
      }


      try {

        setReelFormLoading(
          true
        );


        /*
         * Generate next ID directly
         * from current database data.
         */
        await loadReels();


        const reelId =
          generateNextReelId();


        const reelData = {

          reelId,

          title:
            title ||
            "Untitled Reel",

          reelUrl:
            url,

          thumbnailUrl:
            thumbnail ||
            "",

          status:
            "active",

          feedbackEnabled:
            true,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        };


        await set(
          ref(
            db,
            `reels/${reelId}`
          ),
          reelData
        );


        showAdminMessage(
          `Reel ${reelId} added successfully.`,
          "success"
        );


        form.reset();


        await loadReels();

        renderReelLibrary();


        /*
         * Put generated feedback URL
         * into the UI if available.
         */
        showGeneratedFeedbackURL(
          reelId
        );


      } catch (error) {

        console.error(
          "Add Reel failed:",
          error
        );


        showAdminMessage(
          "Unable to save Reel. Please try again.",
          "error"
        );

      } finally {

        setReelFormLoading(
          false
        );
      }
    }
  );
}


/* =========================================================
   FEEDBACK URL
   ========================================================= */

function getFeedbackURL(
  reelId
) {

  const base =
    window.location.origin +
    window.location.pathname
      .replace(
        /admin\.html.*$/i,
        ""
      );


  return (
    base +
    `index.html?r=${encodeURIComponent(
      reelId
    )}`
  );
}


function showGeneratedFeedbackURL(
  reelId
) {

  const url =
    getFeedbackURL(
      reelId
    );


  const input =
    $(
      "#generatedFeedbackUrl"
    ) ||
    $(
      "[data-feedback-url]"
    );


  if (input) {

    if (
      "value" in input
    ) {
      input.value =
        url;
    } else {
      input.textContent =
        url;
    }

  }
}


/* =========================================================
   COPY FEEDBACK URL
   ========================================================= */

document.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "[data-copy-feedback-url]"
      );


    if (!button) {
      return;
    }


    const input =
      $(
        "#generatedFeedbackUrl"
      ) ||
      $(
        "[data-feedback-url]"
      );


    const url =
      input?.value ||
      input?.textContent ||
      "";


    if (!url) {
      return;
    }


    try {

      await navigator.clipboard
        .writeText(
          url
        );


      showAdminMessage(
        "Feedback URL copied.",
        "success"
      );

    } catch (error) {

      console.error(
        error
      );

      showAdminMessage(
        "Could not copy URL.",
        "error"
      );
    }
  }
);


/* =========================================================
   REEL LIBRARY
   ========================================================= */

function renderReelLibrary() {

  const container =
    $(
      "#reelLibrary"
    ) ||
    $(
      "[data-reel-library]"
    );


  if (!container) {
    return;
  }


  if (
    !state.reels.length
  ) {

    container.innerHTML =
      `
      <div class="empty-state">
        No Reels added yet.
      </div>
      `;

    return;
  }


  container.innerHTML =
    state.reels
      .map(
        (reel) => {

          const id =
            reel.reelId ||
            reel.id;


          const title =
            escapeHTML(
              reel.title ||
              "Untitled Reel"
            );


          const url =
            escapeHTML(
              reel.reelUrl ||
              ""
            );


          const thumbnail =
            reel.thumbnailUrl
              ? `
                <img
                  src="${escapeHTML(
                    reel.thumbnailUrl
                  )}"
                  alt=""
                  loading="lazy"
                >
              `
              : "";


          return `
            <div
              class="reel-item"
              data-reel-id="${escapeHTML(
                id
              )}"
            >

              <div class="reel-item-thumb">
                ${thumbnail}
              </div>

              <div class="reel-item-info">

                <strong>
                  ${escapeHTML(
                    id
                  )}
                </strong>

                <span>
                  ${title}
                </span>

                <small>
                  ${url}
                </small>

              </div>

              <div class="reel-item-actions">

                <button
                  type="button"
                  data-select-reel="${escapeHTML(
                    id
                  )}"
                >
                  View Responses
                </button>

                <button
                  type="button"
                  data-toggle-reel="${escapeHTML(
                    id
                  )}"
                >
                  ${
                    reel.feedbackEnabled
                      ? "Disable"
                      : "Enable"
                  }
                </button>

              </div>

            </div>
          `;
        }
      )
      .join("");
}


/* =========================================================
   REEL ACTIONS
   ========================================================= */

document.addEventListener(
  "click",
  async (event) => {

    const selectButton =
      event.target.closest(
        "[data-select-reel]"
      );


    if (selectButton) {

      const reelId =
        selectButton.dataset
          .selectReel;


      state.selectedReelId =
        reelId;


      await loadFeedback();

      renderResponses();

      return;
    }


    const toggleButton =
      event.target.closest(
        "[data-toggle-reel]"
      );


    if (toggleButton) {

      const reelId =
        toggleButton.dataset
          .toggleReel;


      const reel =
        state.reels.find(
          (item) =>
            (
              item.reelId ||
              item.id
            ) === reelId
        );


      if (!reel) {
        return;
      }


      const enabled =
        reel.feedbackEnabled !==
        true;


      try {

        await update(
          ref(
            db,
            `reels/${reelId}`
          ),
          {
            feedbackEnabled:
              enabled,

            status:
              enabled
                ? "active"
                : "inactive",

            updatedAt:
              serverTimestamp()
          }
        );


        await loadReels();

        renderReelLibrary();

      } catch (error) {

        console.error(
          error
        );

        showAdminMessage(
          "Unable to update Reel.",
          "error"
        );
      }
    }
  }
);


/* =========================================================
   FEEDBACK
   ========================================================= */

async function loadFeedback() {

  const feedbackRef =
    ref(
      db,
      "feedback"
    );


  const snapshot =
    await get(
      feedbackRef
    );


  if (!snapshot.exists()) {

    state.feedback = [];

    return;
  }


  const data =
    snapshot.val();


  state.feedback =
    Object.entries(data)
      .map(
        ([id, item]) => ({
          id,
          ...item
        })
      )
      .sort(
        (a, b) =>
          Number(
            b.completedAt ||
            b.createdAt ||
            0
          ) -
          Number(
            a.completedAt ||
            a.createdAt ||
            0
          )
      );
}


/* =========================================================
   RESPONSE FILTER
   ========================================================= */

function setupResponseFilters() {

  const select =
    $(
      "#reelFilter"
    ) ||
    $(
      "[data-reel-filter]"
    );


  if (!select) {
    return;
  }


  select.addEventListener(
    "change",
    async () => {

      state.selectedReelId =
        select.value ||
        "all";


      renderResponses();

      renderOverview();

      renderPsychology();

      renderUXAnalytics();

      renderTimingAnalytics();

      renderTypingAnalytics();
    }
  );
}


/* =========================================================
   FILTERED FEEDBACK
   ========================================================= */

function getFilteredFeedback() {

  if (
    state.selectedReelId ===
    "all"
  ) {
    return [
      ...state.feedback
    ];
  }


  return state.feedback.filter(
    (item) =>
      item.reelId ===
      state.selectedReelId
  );
}


/* =========================================================
   RESPONSE TABLE
   ========================================================= */

function renderResponses() {

  const container =
    $(
      "#responsesTable"
    ) ||
    $(
      "[data-responses-table]"
    );


  if (!container) {
    return;
  }


  const feedback =
    getFilteredFeedback();


  if (!feedback.length) {

    container.innerHTML =
      `
      <div class="empty-state">
        No responses found.
      </div>
      `;

    return;
  }


  container.innerHTML =
    `
    <div class="table-scroll">

      <table>

        <thead>
          <tr>
            <th>Reel</th>
            <th>Rating</th>
            <th>Answers</th>
            <th>Duration</th>
            <th>Written Feedback</th>
            <th>Submitted</th>
          </tr>
        </thead>

        <tbody>

          ${feedback
            .slice(0, 100)
            .map(
              (item) => {

                const rating =
                  getRating(
                    item
                  );


                const text =
                  getWrittenFeedback(
                    item
                  );


                return `
                  <tr>

                    <td>
                      ${escapeHTML(
                        item.reelId ||
                        "—"
                      )}
                    </td>

                    <td>
                      ${
                        rating
                          ? `${rating}/5`
                          : "—"
                      }
                    </td>

                    <td>
                      ${countAnswers(
                        item
                      )}
                    </td>

                    <td>
                      ${formatDuration(
                        item.totalDurationMs
                      )}
                    </td>

                    <td>
                      ${escapeHTML(
                        text ||
                        "—"
                      )}
                    </td>

                    <td>
                      ${formatDate(
                        item.completedAt ||
                        item.createdAt
                      )}
                    </td>

                  </tr>
                `;
              }
            )
            .join("")}

        </tbody>

      </table>

    </div>
    `;
}


/* =========================================================
   OVERVIEW ANALYTICS
   ========================================================= */

function renderOverview() {

  const feedback =
    getFilteredFeedback();


  setMetric(
    [
      "#totalResponses",
      "[data-total-responses]"
    ],
    feedback.length
  );


  const completed =
    feedback.filter(
      (item) =>
        item.completedAt
    ).length;


  const completionRate =
    feedback.length
      ? Math.round(
          (
            completed /
            feedback.length
          ) * 100
        )
      : 0;


  setMetric(
    [
      "#completionRate",
      "[data-completion-rate]"
    ],
    `${completionRate}%`
  );


  const ratings =
    feedback
      .map(
        getRating
      )
      .filter(
        (value) =>
          value !== null
      );


  const averageRating =
    ratings.length
      ? (
          ratings.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          ratings.length
        ).toFixed(1)
      : "—";


  setMetric(
    [
      "#averageRating",
      "[data-average-rating]"
    ],
    averageRating
  );


  const durations =
    feedback
      .map(
        (item) =>
          Number(
            item.totalDurationMs ||
            0
          )
      )
      .filter(
        (value) =>
          value > 0
      );


  const avgDuration =
    durations.length
      ? durations.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        durations.length
      : 0;


  setMetric(
    [
      "#averageFormTime",
      "[data-average-form-time]"
    ],
    formatDuration(
      avgDuration
    )
  );
}


/* =========================================================
   PSYCHOLOGY ANALYTICS
   ========================================================= */

function renderPsychology() {

  const feedback =
    getFilteredFeedback();


  const emotions =
    countOptionValues(
      feedback,
      "Q001"
    );


  const preferences =
    countOptionValues(
      feedback,
      "Q002"
    );


  const connections =
    countOptionValues(
      feedback,
      "Q003"
    );


  setMetric(
    [
      "#topEmotion",
      "[data-top-emotion]"
    ],
    topValue(
      emotions
    )
  );


  setMetric(
    [
      "#contentPreference",
      "[data-content-preference]"
    ],
    topValue(
      preferences
    )
  );


  setMetric(
    [
      "#strongestConnection",
      "[data-strongest-connection]"
    ],
    topValue(
      connections
    )
  );


  const deepResponses =
    feedback.filter(
      (item) => {

        const text =
          getWrittenFeedback(
            item
          );

        return (
          text.length >= 80
        );
      }
    ).length;


  const deepRate =
    feedback.length
      ? Math.round(
          (
            deepResponses /
            feedback.length
          ) * 100
        )
      : 0;


  setMetric(
    [
      "#deepResponseRate",
      "[data-deep-response-rate]"
    ],
    `${deepRate}%`
  );
}


/* =========================================================
   UI / UX ANALYTICS
   ========================================================= */

function renderUXAnalytics() {

  const feedback =
    getFilteredFeedback();


  const nextClicks =
    sumEngagement(
      feedback,
      "nextClicks"
    );


  const backClicks =
    sumEngagement(
      feedback,
      "backClicks"
    );


  const optionChanges =
    sumEngagement(
      feedback,
      "optionChanges"
    );


  const questionViews =
    sumEngagement(
      feedback,
      "questionViews"
    );


  setMetric(
    [
      "#nextClicks",
      "[data-next-clicks]"
    ],
    nextClicks
  );


  setMetric(
    [
      "#backClicks",
      "[data-back-clicks]"
    ],
    backClicks
  );


  setMetric(
    [
      "#optionChanges",
      "[data-option-changes]"
    ],
    optionChanges
  );


  setMetric(
    [
      "#questionViews",
      "[data-question-views]"
    ],
    questionViews
  );
}


/* =========================================================
   TIMING ANALYTICS
   ========================================================= */

function renderTimingAnalytics() {

  const feedback =
    getFilteredFeedback();


  const durations =
    feedback
      .map(
        (item) =>
          Number(
            item.totalDurationMs ||
            0
          )
      )
      .filter(
        (value) =>
          value > 0
      );


  const average =
    durations.length
      ? durations.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        durations.length
      : 0;


  setMetric(
    [
      "#avgSessionTime",
      "[data-avg-session-time]"
    ],
    formatDuration(
      average
    )
  );


  const questionTimes =
    {};


  feedback.forEach(
    (item) => {

      const timings =
        item.questionTiming ||
        {};


      Object.entries(
        timings
      ).forEach(
        ([questionId, timing]) => {

          if (
            !questionTimes[
              questionId
            ]
          ) {
            questionTimes[
              questionId
            ] = [];
          }


          const time =
            Number(
              timing.totalMs ||
              0
            );


          if (time > 0) {

            questionTimes[
              questionId
            ].push(
              time
            );
          }
        }
      );
    }
  );


  const averages =
    Object.entries(
      questionTimes
    ).map(
      ([questionId, values]) => ({
        questionId,

        average:
          values.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          values.length
      })
    );


  averages.sort(
    (a, b) =>
      b.average -
      a.average
  );


  setMetric(
    [
      "#slowestQuestion",
      "[data-slowest-question]"
    ],
    averages[0]
      ? `${averages[0].questionId} — ${formatDuration(
          averages[0].average
        )}`
      : "—"
  );


  setMetric(
    [
      "#fastestQuestion",
      "[data-fastest-question]"
    ],
    averages.length
      ? `${averages[averages.length - 1].questionId} — ${formatDuration(
          averages[
            averages.length - 1
          ].average
        )}`
      : "—"
  );


  const abandoned =
    feedback.filter(
      (item) =>
        item.engagement
          ?.abandoned === true
    ).length;


  setMetric(
    [
      "#abandonmentRate",
      "[data-abandonment-rate]"
    ],
    feedback.length
      ? `${Math.round(
          (
            abandoned /
            feedback.length
          ) * 100
        )}%`
      : "0%"
  );
}


/* =========================================================
   TYPING ANALYTICS
   ========================================================= */

function renderTypingAnalytics() {

  const feedback =
    getFilteredFeedback();


  const written =
    feedback.filter(
      (item) =>
        getWrittenFeedback(
          item
        ).length > 0
    );


  const characters =
    written.map(
      (item) => {

        const typing =
          getTypingData(
            item
          );

        return Number(
          typing.characterCount ||
          0
        );
      }
    );


  const words =
    written.map(
      (item) => {

        const typing =
          getTypingData(
            item
          );

        return Number(
          typing.wordCount ||
          0
        );
      }
    );


  const writingTimes =
    written.map(
      (item) => {

        const typing =
          getTypingData(
            item
          );

        return Number(
          typing.writingTimeMs ||
          0
        );
      }
    );


  setMetric(
    [
      "#writtenResponses",
      "[data-written-responses]"
    ],
    written.length
  );


  setMetric(
    [
      "#avgCharacters",
      "[data-avg-characters]"
    ],
    average(
      characters
    ).toFixed(1)
  );


  setMetric(
    [
      "#avgWords",
      "[data-avg-words]"
    ],
    average(
      words
    ).toFixed(1)
  );


  setMetric(
    [
      "#avgWritingTime",
      "[data-avg-writing-time]"
    ],
    formatDuration(
      average(
        writingTimes
      )
    )
  );


  const table =
    $(
      "#typingTable"
    ) ||
    $(
      "[data-typing-table]"
    );


  if (!table) {
    return;
  }


  table.innerHTML =
    written
      .slice(0, 100)
      .map(
        (item) => {

          const typing =
            getTypingData(
              item
            );


          return `
            <tr>

              <td>
                ${escapeHTML(
                  item.reelId ||
                  "—"
                )}
              </td>

              <td>
                ${Number(
                  typing.characterCount ||
                  0
                )}
              </td>

              <td>
                ${Number(
                  typing.wordCount ||
                  0
                )}
              </td>

              <td>
                ${formatDuration(
                  typing.writingTimeMs
                )}
              </td>

              <td>
                ${Number(
                  typing.editCount ||
                  0
                )}
              </td>

            </tr>
          `;
        }
      )
      .join("");
}


/* =========================================================
   HELPER — RATING
   ========================================================= */

function getRating(
  feedback
) {

  const answers =
    feedback.answers ||
    {};


  const value =
    answers.Q004;


  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }


  const number =
    Number(value);


  return number >= 1 &&
    number <= 5
    ? number
    : null;
}


/* =========================================================
   HELPER — WRITTEN FEEDBACK
   ========================================================= */

function getWrittenFeedback(
  feedback
) {

  const answers =
    feedback.answers ||
    {};


  const value =
    answers.Q005;


  return String(
    value || ""
  ).trim();
}


/* =========================================================
   HELPER — TYPING DATA
   ========================================================= */

function getTypingData(
  feedback
) {

  const typing =
    feedback.typing ||
    {};


  if (
    typing.Q005
  ) {
    return typing.Q005;
  }


  /*
   * Compatibility if typing was
   * saved directly.
   */
  return typing;
}


/* =========================================================
   HELPER — COUNT ANSWERS
   ========================================================= */

function countAnswers(
  feedback
) {

  return Object.keys(
    feedback.answers ||
    {}
  ).length;
}


/* =========================================================
   OPTION COUNTS
   ========================================================= */

function countOptionValues(
  feedback,
  questionId
) {

  const counts =
    {};


  feedback.forEach(
    (item) => {

      const value =
        item.answers?.[
          questionId
        ];


      if (
        value === undefined ||
        value === null
      ) {
        return;
      }


      const key =
        String(value);


      counts[key] =
        (
          counts[key] ||
          0
        ) + 1;
    }
  );


  return counts;
}


/* =========================================================
   TOP VALUE
   ========================================================= */

function topValue(
  counts
) {

  const entries =
    Object.entries(
      counts
    );


  if (!entries.length) {
    return "—";
  }


  entries.sort(
    (a, b) =>
      b[1] -
      a[1]
  );


  return entries[0][0];
}


/* =========================================================
   ENGAGEMENT SUM
   ========================================================= */

function sumEngagement(
  feedback,
  key
) {

  return feedback.reduce(
    (sum, item) =>
      sum +
      Number(
        item.engagement?.[
          key
        ] || 0
      ),
    0
  );
}


/* =========================================================
   AVERAGE
   ========================================================= */

function average(
  values
) {

  const valid =
    values.filter(
      (value) =>
        Number.isFinite(
          Number(value)
        )
    );


  if (!valid.length) {
    return 0;
  }


  return valid.reduce(
    (sum, value) =>
      sum + Number(value),
    0
  ) / valid.length;
}


/* =========================================================
   METRIC SETTER
   ========================================================= */

function setMetric(
  selectors,
  value
) {

  for (
    const selector
    of selectors
  ) {

    const element =
      $(selector);


    if (element) {

      element.textContent =
        value;

      return;
    }
  }
}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(
  value
) {

  if (!value) {
    return "—";
  }


  let timestamp;


  if (
    typeof value ===
    "number"
  ) {
    timestamp =
      value;
  } else if (
    typeof value ===
    "object" &&
    value[".sv"] ===
      "timestamp"
  ) {
    return "Just now";
  } else {
    timestamp =
      Date.parse(
        value
      );
  }


  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return "—";
  }


  return new Date(
    timestamp
  ).toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}


/* =========================================================
   DURATION
   ========================================================= */

function formatDuration(
  milliseconds
) {

  const ms =
    Number(
      milliseconds
    ) || 0;


  if (ms <= 0) {
    return "—";
  }


  const seconds =
    Math.round(
      ms / 1000
    );


  const minutes =
    Math.floor(
      seconds / 60
    );


  const remaining =
    seconds % 60;


  if (minutes > 0) {
    return `${minutes}m ${remaining}s`;
  }


  return `${remaining}s`;
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

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


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

  $$(
    "[data-section], [data-nav]"
  ).forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const section =
            button.dataset.section ||
            button.dataset.nav;


          if (!section) {
            return;
          }


          state.currentSection =
            section;


          $$(
            "[data-section-panel]"
          ).forEach(
            (panel) => {

              panel.classList.toggle(
                "active",
                panel.dataset
                  .sectionPanel ===
                  section
              );
            }
          );


          $$(
            "[data-section], [data-nav]"
          ).forEach(
            (item) => {

              item.classList.toggle(
                "active",
                (
                  item.dataset.section ||
                  item.dataset.nav
                ) === section
              );
            }
          );
        }
      );
    }
  );
}


/* =========================================================
   ADMIN MESSAGE
   ========================================================= */

function showAdminMessage(
  message,
  type = "success"
) {

  let element =
    $(
      "[data-admin-message]"
    );


  if (!element) {

    element =
      document.createElement(
        "div"
      );

    element.dataset
      .adminMessage =
      "true";

    document.body.appendChild(
      element
    );
  }


  element.textContent =
    message;

  element.className =
    `admin-message ${type}`;


  setTimeout(
    () => {
      element.classList.add(
        "hide"
      );
    },
    3500
  );
}


/* =========================================================
   DASHBOARD ERROR
   ========================================================= */

function showDashboardError(
  message
) {

  showAdminMessage(
    message,
    "error"
  );
}


/* =========================================================
   REEL FORM LOADING
   ========================================================= */

function setReelFormLoading(
  loading
) {

  const form =
    $(
      "#addReelForm"
    ) ||
    $(
      "[data-add-reel-form]"
    );


  if (!form) {
    return;
  }


  const button =
    form.querySelector(
      "button[type='submit']"
    );


  if (!button) {
    return;
  }


  button.disabled =
    loading;


  button.textContent =
    loading
      ? "Saving Reel..."
      : "Add Reel";
}
