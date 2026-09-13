/* =========================================================
   RUDRA BHAKTI — ADMIN DASHBOARD
   js/admin.js
   ========================================================= */

(() => {
  "use strict";

  /* -------------------------------------------------------
     CONFIG
  ------------------------------------------------------- */

  const STORAGE_KEY = "rudraBhaktiAdminReels";

  const SECTION_TITLES = {
    overview: "Overview",
    reels: "Reel Manager",
    responses: "Responses",
    psychology: "Psychology Analytics",
    ux: "UI / UX Analytics",
    timing: "Response Timing",
    typing: "Typing Analytics"
  };

  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  const state = {
    currentSection: "overview",
    selectedOverviewReel: "all",
    selectedResponseReel: "all",
    reels: loadReels(),
    responses: []
  };

  /* -------------------------------------------------------
     DOM HELPERS
  ------------------------------------------------------- */

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* -------------------------------------------------------
     LOCAL STORAGE
  ------------------------------------------------------- */

  function loadReels() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) return [];

      const parsed = JSON.parse(stored);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Unable to load local reel data:", error);
      return [];
    }
  }

  function saveReels() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state.reels)
      );
    } catch (error) {
      console.warn("Unable to save local reel data:", error);
    }
  }

  /* -------------------------------------------------------
     REEL ID
  ------------------------------------------------------- */

  function generateReelId() {
    let highest = 0;

    state.reels.forEach((reel) => {
      const match = String(reel.reelId || "").match(/^RB(\d+)$/i);

      if (match) {
        highest = Math.max(
          highest,
          parseInt(match[1], 10)
        );
      }
    });

    return `RB${String(highest + 1).padStart(4, "0")}`;
  }

  /* -------------------------------------------------------
     FEEDBACK URL
  ------------------------------------------------------- */

  function getFeedbackURL(reelId) {
    const basePath =
      window.location.origin +
      window.location.pathname.replace(/admin\.html$/i, "");

    return `${basePath}index.html?r=${encodeURIComponent(reelId)}`;
  }

  /* -------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------- */

  function activateSection(sectionName) {
    if (!SECTION_TITLES[sectionName]) return;

    state.currentSection = sectionName;

    $$(".nav-item").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.section === sectionName
      );
    });

    $$("[id^='section-']").forEach((section) => {
      section.classList.remove("active");
    });

    const target = $(`#section-${sectionName}`);

    if (target) {
      target.classList.add("active");
    }

    setText(
      "#pageTitle",
      SECTION_TITLES[sectionName]
    );
  }

  function setupNavigation() {
    $$(".nav-item[data-section]").forEach((button) => {
      button.addEventListener("click", () => {
        activateSection(button.dataset.section);
      });
    });

    $$("[data-section-link]").forEach((button) => {
      button.addEventListener("click", () => {
        activateSection(button.dataset.sectionLink);
      });
    });
  }

  /* -------------------------------------------------------
     CONNECTION STATUS
  ------------------------------------------------------- */

  function setConnectionStatus() {
    setText(
      "#connectionText",
      "Frontend mode • Firebase pending"
    );
  }

  /* -------------------------------------------------------
     REEL FILTERS
  ------------------------------------------------------- */

  function populateReelFilters() {
    const filters = [
      "#overviewReelFilter",
      "#responseReelFilter"
    ];

    filters.forEach((selector) => {
      const select = $(selector);

      if (!select) return;

      const currentValue = select.value || "all";

      select.innerHTML = `
        <option value="all">All Reels</option>
        ${state.reels
          .map(
            (reel) => `
              <option value="${escapeHTML(reel.reelId)}">
                ${escapeHTML(reel.reelId)} — ${escapeHTML(
              reel.title || "Untitled Reel"
            )}
              </option>
            `
          )
          .join("")}
      `;

      if (
        [...select.options].some(
          (option) => option.value === currentValue
        )
      ) {
        select.value = currentValue;
      }
    });
  }

  function setupFilters() {
    const overviewFilter = $("#overviewReelFilter");

    if (overviewFilter) {
      overviewFilter.addEventListener("change", (event) => {
        state.selectedOverviewReel = event.target.value;
        renderOverview();
      });
    }

    const responseFilter = $("#responseReelFilter");

    if (responseFilter) {
      responseFilter.addEventListener("change", (event) => {
        state.selectedResponseReel = event.target.value;
        renderResponses();
      });
    }
  }

  /* -------------------------------------------------------
     REEL MANAGER
  ------------------------------------------------------- */

  function setupReelForm() {
    const form = $("#addReelForm");

    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const urlInput = $("#reelUrl");
      const titleInput = $("#reelTitle");
      const thumbnailInput = $("#reelThumbnail");
      const status = $("#reelFormStatus");

      const reelUrl = urlInput?.value.trim() || "";
      const title = titleInput?.value.trim() || "";
      const thumbnailUrl =
        thumbnailInput?.value.trim() || "";

      if (!reelUrl) {
        showFormStatus(
          "Please enter the Facebook Reel URL.",
          "error"
        );
        return;
      }

      try {
        new URL(reelUrl);
      } catch {
        showFormStatus(
          "Please enter a valid Reel URL.",
          "error"
        );
        return;
      }

      const reelId = generateReelId();

      const newReel = {
        reelId,
        title: title || "Untitled Reel",
        reelUrl,
        thumbnailUrl,
        status: "active",
        feedbackEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      state.reels.unshift(newReel);

      saveReels();
      populateReelFilters();
      renderReels();
      renderOverview();

      form.reset();

      showFormStatus(
        `${reelId} created successfully.`,
        "success"
      );
    });
  }

  function showFormStatus(message, type) {
    const element = $("#reelFormStatus");

    if (!element) return;

    element.textContent = message;

    element.classList.remove(
      "success",
      "error"
    );

    element.classList.add(type);

    clearTimeout(
      showFormStatus.timeout
    );

    showFormStatus.timeout = setTimeout(() => {
      element.textContent = "";
      element.classList.remove(
        "success",
        "error"
      );
    }, 4000);
  }

  function renderReels() {
    const table = $("#reelTable");
    const count = $("#reelCount");

    if (count) {
      count.textContent = state.reels.length;
    }

    if (!table) return;

    if (!state.reels.length) {
      table.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            No reels added yet.
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = state.reels
      .map((reel) => {
        const feedbackURL =
          getFeedbackURL(reel.reelId);

        return `
          <tr>
            <td>
              <strong>${escapeHTML(
                reel.reelId
              )}</strong>
            </td>

            <td>
              <div class="reel-cell">
                ${
                  reel.thumbnailUrl
                    ? `
                      <img
                        src="${escapeHTML(
                          reel.thumbnailUrl
                        )}"
                        alt=""
                        class="reel-thumb"
                        loading="lazy"
                      >
                    `
                    : `
                      <div class="reel-thumb placeholder">
                        RB
                      </div>
                    `
                }

                <span>
                  ${escapeHTML(
                    reel.title || "Untitled Reel"
                  )}
                </span>
              </div>
            </td>

            <td>
              <span class="status-badge ${
                reel.status === "active"
                  ? "active"
                  : "inactive"
              }">
                ${escapeHTML(reel.status)}
              </span>
            </td>

            <td>
              ${
                reel.feedbackEnabled
                  ? "Enabled"
                  : "Disabled"
              }
            </td>

            <td>
              ${formatDate(reel.createdAt)}
            </td>

            <td>
              <div class="table-actions">

                <button
                  type="button"
                  class="table-action"
                  data-copy-link="${escapeHTML(
                    feedbackURL
                  )}"
                >
                  Copy Link
                </button>

                <button
                  type="button"
                  class="table-action"
                  data-toggle-reel="${escapeHTML(
                    reel.reelId
                  )}"
                >
                  ${
                    reel.status === "active"
                      ? "Disable"
                      : "Enable"
                  }
                </button>

              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    setupReelTableActions();
  }

  function setupReelTableActions() {
    $$("[data-copy-link]").forEach((button) => {
      button.addEventListener("click", async () => {
        const url = button.dataset.copyLink;

        try {
          await navigator.clipboard.writeText(url);

          const original = button.textContent;

          button.textContent = "Copied";

          setTimeout(() => {
            button.textContent = original;
          }, 1500);
        } catch {
          window.prompt(
            "Copy this feedback URL:",
            url
          );
        }
      });
    });

    $$("[data-toggle-reel]").forEach((button) => {
      button.addEventListener("click", () => {
        const reelId =
          button.dataset.toggleReel;

        const reel = state.reels.find(
          (item) => item.reelId === reelId
        );

        if (!reel) return;

        reel.status =
          reel.status === "active"
            ? "inactive"
            : "active";

        reel.feedbackEnabled =
          reel.status === "active";

        reel.updatedAt =
          new Date().toISOString();

        saveReels();

        renderReels();
        populateReelFilters();
      });
    });
  }

  /* -------------------------------------------------------
     DATE
  ------------------------------------------------------- */

  function formatDate(dateValue) {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  }

  /* -------------------------------------------------------
     OVERVIEW
  ------------------------------------------------------- */

  function renderOverview() {
    /*
      Firebase data will populate these values later.

      We intentionally avoid fake analytics numbers.
    */

    setText("#totalResponses", "0");
    setText("#completionRate", "—");
    setText("#averageRating", "—");
    setText("#averageFormTime", "—");

    renderLatestResponses();
  }

  function renderLatestResponses() {
    const table = $("#latestResponsesTable");

    if (!table) return;

    if (!state.responses.length) {
      table.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            No responses available yet.
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = state.responses
      .slice(0, 10)
      .map(
        (response) => `
          <tr>
            <td>${escapeHTML(
              response.reelId
            )}</td>
            <td>${escapeHTML(
              response.topEmotion || "—"
            )}</td>
            <td>${escapeHTML(
              response.rating || "—"
            )}</td>
            <td>${escapeHTML(
              response.duration || "—"
            )}</td>
            <td>${formatDate(
              response.completedAt
            )}</td>
          </tr>
        `
      )
      .join("");
  }

  /* -------------------------------------------------------
     RESPONSES
  ------------------------------------------------------- */

  function renderResponses() {
    const table = $("#responsesTable");

    if (!table) return;

    const selected =
      state.selectedResponseReel;

    const filtered =
      selected === "all"
        ? state.responses
        : state.responses.filter(
            (response) =>
              response.reelId === selected
          );

    if (!filtered.length) {
      table.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            No responses available yet.
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = filtered
      .map(
        (response) => `
          <tr>
            <td>${escapeHTML(
              response.reelId
            )}</td>
            <td>${escapeHTML(
              response.sessionId || "—"
            )}</td>
            <td>${escapeHTML(
              response.topEmotion || "—"
            )}</td>
            <td>${escapeHTML(
              response.preference || "—"
            )}</td>
            <td>${escapeHTML(
              response.connection || "—"
            )}</td>
            <td>${escapeHTML(
              response.rating || "—"
            )}</td>
            <td>${formatDate(
              response.completedAt
            )}</td>
          </tr>
        `
      )
      .join("");
  }

  /* -------------------------------------------------------
     PSYCHOLOGY
  ------------------------------------------------------- */

  function renderPsychology() {
    setText("#psychTopEmotion", "—");
    setText("#psychPreference", "—");
    setText("#psychConnection", "—");
    setText("#psychDeepRate", "—");

    renderSimpleChart(
      "#emotionChart",
      "No response data yet"
    );

    renderSimpleChart(
      "#connectionChart",
      "No response data yet"
    );
  }

  /* -------------------------------------------------------
     UI / UX
  ------------------------------------------------------- */

  function renderUX() {
    setText("#uxNextClicks", "0");
    setText("#uxBackClicks", "0");
    setText("#uxOptionChanges", "0");
    setText("#uxQuestionViews", "0");

    renderSimpleChart(
      "#uxChart",
      "No interaction data yet"
    );
  }

  /* -------------------------------------------------------
     RESPONSE TIMING
  ------------------------------------------------------- */

  function renderTiming() {
    setText("#timingSession", "—");
    setText("#timingFastest", "—");
    setText("#timingSlowest", "—");
    setText("#timingAbandonment", "—");

    const table = $("#timingTable");

    if (!table) return;

    table.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          No timing data available yet.
        </td>
      </tr>
    `;
  }

  /* -------------------------------------------------------
     TYPING ANALYTICS
  ------------------------------------------------------- */

  function renderTyping() {
    setText("#typingResponses", "0");
    setText("#typingCharacters", "—");
    setText("#typingWords", "—");
    setText("#typingTime", "—");

    const table =
      $("#writtenResponsesTable");

    if (!table) return;

    table.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          No written feedback available yet.
        </td>
      </tr>
    `;
  }

  /* -------------------------------------------------------
     SIMPLE CHART PLACEHOLDER
  ------------------------------------------------------- */

  function renderSimpleChart(
    selector,
    message
  ) {
    const container = $(selector);

    if (!container) return;

    container.innerHTML = `
      <div class="chart-empty">
        ${escapeHTML(message)}
      </div>
    `;
  }

  /* -------------------------------------------------------
     REFRESH
  ------------------------------------------------------- */

  function refreshDashboard() {
    state.reels = loadReels();

    populateReelFilters();
    renderReels();
    renderOverview();
    renderResponses();
    renderPsychology();
    renderUX();
    renderTiming();
    renderTyping();
  }

  /* -------------------------------------------------------
     FUTURE FIREBASE DATA LAYER
  ------------------------------------------------------- */

  /*
    Firebase integration will replace the demo repository.

    Planned functions:

      loadReelsFromFirebase()
      loadResponsesFromFirebase()
      createReelInFirebase()
      updateReelInFirebase()
      loadQuestionsFromFirebase()

    Important:
    Do NOT put Firebase Admin SDK credentials or service
    account private keys inside this file.

    Admin authorization will later be handled with:
      Firebase Authentication
      + custom admin claims
      + Firestore Security Rules
  */

  /* -------------------------------------------------------
     INITIALIZE
  ------------------------------------------------------- */

  function init() {
    setupNavigation();
    setupFilters();
    setupReelForm();

    setConnectionStatus();

    refreshDashboard();

    activateSection("overview");
  }

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

})();
