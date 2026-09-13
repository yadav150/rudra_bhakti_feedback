/* =========================================================
   RUDRA BHAKTI — PUBLIC FEEDBACK CONTROLLER
   js/script.js
   ========================================================= */

import {
  getReel,
  getActiveQuestions,
  submitFeedback
} from "./firebase-service.js";


/* =========================================================
   STATE
   ========================================================= */

const state = {
  reelId: null,
  reel: null,
  questions: [],

  currentQuestion: 0,

  answers: {},

  questionTiming: {},

  engagement: {
    nextClicks: 0,
    backClicks: 0,
    optionChanges: 0,
    questionViews: 0
  },

  startedAt: null,
  completedAt: null,

  questionEnteredAt: null,

  sessionId: getSessionId(),

  submitted: false
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];


/* =========================================================
   SESSION ID
   ========================================================= */

function getSessionId() {
  const key =
    "rudraBhaktiFeedbackSession";

  let sessionId =
    sessionStorage.getItem(key);

  if (!sessionId) {
    sessionId =
      crypto.randomUUID
        ? crypto.randomUUID()
        : createFallbackId();

    sessionStorage.setItem(
      key,
      sessionId
    );
  }

  return sessionId;
}


function createFallbackId() {
  return (
    "RB-" +
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}


/* =========================================================
   REEL ID FROM URL
   ========================================================= */

function getReelIdFromURL() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("r") ||
    params.get("reel") ||
    params.get("reelId") ||
    "RB001"
  );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  init
);


async function init() {
  try {
    state.reelId =
      getReelIdFromURL();

    state.startedAt =
      new Date().toISOString();

    await loadFirebaseData();

    setupExistingUI();

    setupQuestionFlow();

    updateReelInformation();

    showQuestion(0);

  } catch (error) {
    console.error(
      "Rudra Bhakti initialization failed:",
      error
    );

    showLoadingError(error);
  }
}


/* =========================================================
   FIREBASE DATA
   ========================================================= */

async function loadFirebaseData() {
  /*
   * Load Reel information.
   */
  try {
    state.reel =
      await getReel(
        state.reelId
      );
  } catch (error) {
    console.warn(
      "Unable to load Reel:",
      error
    );
  }


  /*
   * Load active questions.
   *
   * If Firebase questions are not available yet,
   * the local questions below keep the current
   * frontend functional.
   */
  try {
    state.questions =
      await getActiveQuestions();
  } catch (error) {
    console.warn(
      "Unable to load Firebase questions:",
      error
    );
  }


  /*
   * Do not leave the public form empty if
   * Firebase questions have not been created yet.
   */
  if (
    !Array.isArray(state.questions) ||
    state.questions.length === 0
  ) {
    state.questions =
      getDefaultQuestions();
  }
}


/* =========================================================
   DEFAULT QUESTIONS
   ========================================================= */

function getDefaultQuestions() {
  return [
    {
      questionId: "Q001",

      questionText:
        "How did this Reel make you feel?",

      hindiText:
        "इस रील को देखकर आपको कैसा महसूस हुआ?",

      type: "single",

      required: true,

      order: 1,

      active: true,

      options: [
        {
          optionId: "Q001_O01",
          text: "Peaceful"
        },
        {
          optionId: "Q001_O02",
          text: "Devotional"
        },
        {
          optionId: "Q001_O03",
          text: "Emotional"
        },
        {
          optionId: "Q001_O04",
          text: "Inspired"
        },
        {
          optionId: "Q001_O05",
          text: "Calm"
        },
        {
          optionId: "Q001_O06",
          text: "Deeply moved"
        }
      ]
    },

    {
      questionId: "Q002",

      questionText:
        "Would you like to see more Reels like this?",

      hindiText:
        "क्या आप इस तरह की और रील देखना चाहेंगे?",

      type: "single",

      required: true,

      order: 2,

      active: true,

      options: [
        {
          optionId: "Q002_O01",
          text:
            "Definitely — I love this type of content"
        },
        {
          optionId: "Q002_O02",
          text: "Yes, sometimes"
        },
        {
          optionId: "Q002_O03",
          text: "I'm not sure"
        },
        {
          optionId: "Q002_O04",
          text: "Not really"
        }
      ]
    },

    {
      questionId: "Q003",

      questionText:
        "What did you connect with the most?",

      hindiText:
        "इस रील में आपको सबसे ज्यादा किस चीज़ से जुड़ाव महसूस हुआ?",

      type: "single",

      required: true,

      order: 3,

      active: true,

      options: [
        {
          optionId: "Q003_O01",
          text:
            "The Shiva & Parvati emotion"
        },
        {
          optionId: "Q003_O02",
          text:
            "The devotional feeling"
        },
        {
          optionId: "Q003_O03",
          text:
            "The artwork / visuals"
        },
        {
          optionId: "Q003_O04",
          text:
            "The music"
        },
        {
          optionId: "Q003_O05",
          text:
            "Everything together"
        }
      ]
    },

    {
      questionId: "Q004",

      questionText:
        "How would you rate this Reel?",

      hindiText:
        "आप इस रील को कितने अंक देना चाहेंगे?",

      type: "rating",

      required: true,

      order: 4,

      active: true
    },

    {
      questionId: "Q005",

      questionText:
        "Tell us what you felt",

      hindiText:
        "आपने क्या महसूस किया, हमें बताइए।",

      type: "text",

      required: false,

      order: 5,

      active: true,

      placeholder:
        "Share your thoughts, emotions or suggestions..."
    }
  ];
}


/* =========================================================
   EXISTING UI
   ========================================================= */

function setupExistingUI() {
  setupOptionSelection();

  setupRating();

  setupVoiceButtons();

  setupSubmitButton();

  setupBackButton();

  setupNextButton();
}


/* =========================================================
   QUESTION FLOW
   ========================================================= */

function setupQuestionFlow() {
  /*
   * If the existing HTML already contains
   * question cards, keep them and control visibility.
   */
  const cards =
    $$(".question-card");

  if (!cards.length) {
    return;
  }

  cards.forEach((card, index) => {
    card.dataset.questionIndex =
      String(index);
  });
}


function showQuestion(index) {
  const cards =
    $$(".question-card");

  if (!cards.length) {
    return;
  }

  if (
    index < 0 ||
    index >= cards.length
  ) {
    return;
  }

  /*
   * Record timing for previous question.
   */
  if (
    state.questionEnteredAt !== null &&
    state.currentQuestion !== index
  ) {
    recordQuestionTiming(
      state.currentQuestion
    );
  }

  state.currentQuestion =
    index;

  state.questionEnteredAt =
    performance.now();

  state.engagement.questionViews++;

  cards.forEach(
    (card, cardIndex) => {
      const visible =
        cardIndex === index;

      card.hidden =
        !visible;

      card.classList.toggle(
        "active",
        visible
      );
    }
  );

  updateNavigation(index);

  restoreAnswerForQuestion(index);
}


function updateNavigation(index) {
  const backButton =
    $(
      "[data-action='back'], #backButton"
    );

  const nextButton =
    $(
      "[data-action='next'], #nextButton"
    );

  const submitButton =
    $(
      "[data-action='submit'], #submitButton"
    );

  if (backButton) {
    backButton.disabled =
      index === 0;
  }

  const last =
    index ===
    $$(".question-card").length - 1;

  if (nextButton) {
    nextButton.hidden =
      last;
  }

  if (submitButton) {
    submitButton.hidden =
      !last;
  }
}


/* =========================================================
   NEXT / BACK
   ========================================================= */

function setupNextButton() {
  const buttons =
    $$(
      "[data-action='next'], #nextButton"
    );

  buttons.forEach((button) => {
    button.addEventListener(
      "click",
      () => {

        if (
          !validateCurrentQuestion()
        ) {
          return;
        }

        state.engagement.nextClicks++;

        showQuestion(
          state.currentQuestion + 1
        );
      }
    );
  });
}


function setupBackButton() {
  const buttons =
    $$(
      "[data-action='back'], #backButton"
    );

  buttons.forEach((button) => {
    button.addEventListener(
      "click",
      () => {

        if (
          state.currentQuestion <= 0
        ) {
          return;
        }

        state.engagement.backClicks++;

        showQuestion(
          state.currentQuestion - 1
        );
      }
    );
  });
}


/* =========================================================
   OPTION SELECTION
   ========================================================= */

function setupOptionSelection() {
  const optionElements =
    $$(
      "input[type='radio'], input[type='checkbox']"
    );

  optionElements.forEach((input) => {

    input.addEventListener(
      "change",
      () => {

        const questionId =
          getQuestionIdFromElement(
            input
          );

        if (!questionId) {
          return;
        }

        const previous =
          state.answers[
            questionId
          ];

        const value =
          input.value ||
          input.dataset.optionId ||
          getOptionId(input);

        state.answers[
          questionId
        ] = value;

        if (
          previous !== undefined &&
          previous !== value
        ) {
          state.engagement.optionChanges++;
        }

        /*
         * Store stable option ID whenever available.
         */
        const optionId =
          input.dataset.optionId ||
          getOptionId(input);

        if (optionId) {
          state.answers[
            questionId
          ] = {
            optionId,
            value
          };
        }
      }
    );
  });
}


function getQuestionIdFromElement(
  element
) {
  const explicit =
    element.dataset.questionId;

  if (explicit) {
    return explicit;
  }

  const group =
    element.name;

  if (group) {
    const match =
      group.match(
        /Q\d+/i
      );

    if (match) {
      return match[0].toUpperCase();
    }
  }

  const card =
    element.closest(
      ".question-card"
    );

  if (card?.dataset.questionId) {
    return card.dataset.questionId;
  }

  return null;
}


function getOptionId(input) {
  return (
    input.dataset.optionId ||
    input.id ||
    null
  );
}


/* =========================================================
   RATING
   ========================================================= */

function setupRating() {
  const ratingInputs =
    $$(
      "input[type='radio'][data-rating], .rating input"
    );

  ratingInputs.forEach((input) => {
    input.addEventListener(
      "change",
      () => {

        const questionId =
          input.dataset.questionId ||
          "Q004";

        state.answers[
          questionId
        ] = {
          optionId:
            input.dataset.optionId ||
            `Q004_O${input.value}`,

          value:
            Number(input.value)
        };
      }
    );
  });
}


/* =========================================================
   RESTORE ANSWERS
   ========================================================= */

function restoreAnswerForQuestion(
  index
) {
  const card =
    $$(".question-card")[index];

  if (!card) {
    return;
  }

  const questionId =
    card.dataset.questionId ||
    `Q${String(index + 1).padStart(3, "0")}`;

  const saved =
    state.answers[
      questionId
    ];

  if (!saved) {
    return;
  }

  const value =
    typeof saved === "object"
      ? saved.value
      : saved;

  const input =
    card.querySelector(
      `input[value="${CSS.escape(
        String(value)
      )}"]`
    );

  if (input) {
    input.checked = true;
  }
}


/* =========================================================
   VALIDATION
   ========================================================= */

function validateCurrentQuestion() {
  const card =
    $$(".question-card")[
      state.currentQuestion
    ];

  if (!card) {
    return true;
  }

  /*
   * Text question is optional.
   */
  const textarea =
    card.querySelector(
      "textarea"
    );

  if (textarea) {
    return true;
  }

  const checked =
    card.querySelector(
      "input:checked"
    );

  if (!checked) {
    showValidationMessage(
      "Please select an option to continue."
    );

    return false;
  }

  return true;
}


function showValidationMessage(
  message
) {
  let element =
    $("#formValidationMessage");

  if (!element) {
    element =
      document.createElement("div");

    element.id =
      "formValidationMessage";

    element.setAttribute(
      "role",
      "alert"
    );

    element.style.marginTop =
      "12px";

    element.style.fontSize =
      "13px";

    element.style.textAlign =
      "center";

    const card =
      $$(".question-card")[
        state.currentQuestion
      ];

    card?.appendChild(element);
  }

  element.textContent =
    message;

  clearTimeout(
    showValidationMessage.timeout
  );

  showValidationMessage.timeout =
    setTimeout(() => {
      element.textContent = "";
    }, 2500);
}


/* =========================================================
   VOICE / HINDI TEXT TO SPEECH
   ========================================================= */

function setupVoiceButtons() {
  $$(
    "[data-voice], .voice-button, .speak-button"
  ).forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        const targetId =
          button.dataset.voiceTarget;

        let text = "";

        if (targetId) {
          const target =
            document.getElementById(
              targetId
            );

          text =
            target?.textContent || "";
        }

        if (!text) {
          const card =
            button.closest(
              ".question-card"
            );

          const hindi =
            card?.querySelector(
              ".hindi-tts, .hindi-text, [data-hindi]"
            );

          text =
            hindi?.textContent || "";
        }

        if (!text) {
          return;
        }

        speakHindi(
          text
        );
      }
    );
  });
}


function speakHindi(text) {
  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  utterance.lang =
    "hi-IN";

  utterance.rate =
    0.9;

  utterance.pitch =
    1;

  window.speechSynthesis.speak(
    utterance
  );
}


/* =========================================================
   REEL INFORMATION
   ========================================================= */

function updateReelInformation() {
  if (!state.reel) {
    return;
  }

  const title =
    state.reel.title ||
    "Shiva & Parvati — Eternal Love";

  const reelId =
    state.reel.reelId ||
    state.reelId;

  const titleElements =
    $$(
      "[data-reel-title], #reelTitle"
    );

  titleElements.forEach(
    (element) => {
      element.textContent =
        title;
    }
  );

  const idElements =
    $$(
      "[data-reel-id], #reelId"
    );

  idElements.forEach(
    (element) => {
      element.textContent =
        reelId;
    }
  );

  const thumbnails =
    $$(
      "[data-reel-thumbnail], #reelThumbnail"
    );

  thumbnails.forEach(
    (image) => {
      if (
        state.reel.thumbnailUrl
      ) {
        image.src =
          state.reel.thumbnailUrl;

        image.hidden =
          false;
      }
    }
  );
}


/* =========================================================
   TEXT FEEDBACK
   ========================================================= */

function getWrittenFeedback() {
  const textarea =
    document.querySelector(
      "textarea"
    );

  if (!textarea) {
    return "";
  }

  return textarea.value.trim();
}


/* =========================================================
   TYPING ANALYTICS
   ========================================================= */

const typingState = {
  startedAt: null,
  firstInputAt: null,
  lastInputAt: null,
  inputEvents: 0,
  editCount: 0,
  maxLength: 0
};


function setupTypingAnalytics() {
  const textarea =
    document.querySelector(
      "textarea"
    );

  if (!textarea) {
    return;
  }

  textarea.addEventListener(
    "focus",
    () => {
      if (
        typingState.startedAt === null
      ) {
        typingState.startedAt =
          performance.now();
      }
    }
  );

  textarea.addEventListener(
    "input",
    () => {

      const now =
        performance.now();

      if (
        typingState.firstInputAt === null
      ) {
        typingState.firstInputAt =
          now;
      }

      typingState.lastInputAt =
        now;

      typingState.inputEvents++;

      typingState.editCount++;

      typingState.maxLength =
        Math.max(
          typingState.maxLength,
          textarea.value.length
        );
    }
  );
}


function getTypingAnalytics() {
  const text =
    getWrittenFeedback();

  const words =
    text
      ? text
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .length
      : 0;

  let writingTimeMs = 0;

  if (
    typingState.firstInputAt !== null &&
    typingState.lastInputAt !== null
  ) {
    writingTimeMs =
      Math.max(
        0,
        typingState.lastInputAt -
          typingState.firstInputAt
      );
  }

  return {
    characterCount:
      text.length,

    wordCount:
      words,

    writingTimeMs,

    inputEvents:
      typingState.inputEvents,

    editCount:
      typingState.editCount
  };
}


/* =========================================================
   QUESTION TIMING
   ========================================================= */

function recordQuestionTiming(
  questionIndex
) {
  if (
    state.questionEnteredAt === null
  ) {
    return;
  }

  const duration =
    Math.max(
      0,
      performance.now() -
        state.questionEnteredAt
    );

  const card =
    $$(".question-card")[
      questionIndex
    ];

  if (!card) {
    return;
  }

  const questionId =
    card.dataset.questionId ||
    `Q${String(
      questionIndex + 1
    ).padStart(3, "0")}`;

  const existing =
    state.questionTiming[
      questionId
    ];

  if (existing) {
    existing.viewCount++;

    existing.totalViewTimeMs +=
      duration;

  } else {
    state.questionTiming[
      questionId
    ] = {
      viewCount: 1,
      totalViewTimeMs:
        duration,

      answerTimeMs:
        duration
    };
  }
}


/* =========================================================
   DEVICE INFORMATION
   ========================================================= */

function getDeviceInfo() {
  return {
    userAgent:
      navigator.userAgent,

    language:
      navigator.language || "",

    platform:
      navigator.platform || "",

    screenWidth:
      window.screen.width,

    screenHeight:
      window.screen.height,

    viewportWidth:
      window.innerWidth,

    viewportHeight:
      window.innerHeight,

    devicePixelRatio:
      window.devicePixelRatio || 1,

    online:
      navigator.onLine
  };
}


/* =========================================================
   SUBMIT
   ========================================================= */

function setupSubmitButton() {
  const buttons =
    $$(
      "[data-action='submit'], #submitButton, button[type='submit']"
    );

  buttons.forEach((button) => {

    button.addEventListener(
      "click",
      async (event) => {

        /*
         * Prevent the HTML form's default
         * page reload.
         */
        const form =
          button.closest("form");

        if (form) {
          event.preventDefault();
        }

        await handleSubmit(button);
      }
    );
  });
}


async function handleSubmit(
  button
) {
  if (state.submitted) {
    return;
  }

  if (
    !validateCurrentQuestion()
  ) {
    return;
  }

  state.completedAt =
    new Date().toISOString();

  /*
   * Record final question timing.
   */
  recordQuestionTiming(
    state.currentQuestion
  );

  const started =
    new Date(
      state.startedAt
    ).getTime();

  const completed =
    new Date(
      state.completedAt
    ).getTime();

  const totalDurationMs =
    Math.max(
      0,
      completed - started
    );

  /*
   * Add textarea answer.
   */
  const writtenFeedback =
    getWrittenFeedback();

  if (writtenFeedback) {
    state.answers.Q005 = {
      optionId: "Q005_TEXT",
      value: writtenFeedback
    };
  }

  /*
   * Typing analytics.
   */
  const typing =
    getTypingAnalytics();

  state.engagement.typing =
    typing;

  /*
   * Lock button.
   */
  const originalText =
    button?.textContent ||
    "Share My Feedback";

  if (button) {
    button.disabled =
      true;

    button.textContent =
      "Submitting…";
  }

  const payload = {
    reelId:
      state.reelId,

    sessionId:
      state.sessionId,

    answers:
      state.answers,

    questionTiming:
      state.questionTiming,

    engagement:
      state.engagement,

    typing,

    device:
      getDeviceInfo(),

    startedAt:
      state.startedAt,

    completedAt:
      state.completedAt,

    totalDurationMs
  };

  try {

    await submitFeedback(
      payload
    );

    state.submitted =
      true;

    showSuccess();

  } catch (error) {

    console.error(
      "Feedback submission failed:",
      error
    );

    if (button) {
      button.disabled =
        false;

      button.textContent =
        originalText;
    }

    showSubmitError(
      error
    );
  }
}


/* =========================================================
   SUCCESS
   ========================================================= */

function showSuccess() {
  const form =
    document.querySelector(
      "form"
    );

  /*
   * Existing success section.
   */
  const success =
    $(
      "#success, .success-screen, [data-success]"
    );

  if (form) {
    form.style.display =
      "none";
  }

  if (success) {
    success.hidden =
      false;

    success.style.display =
      "";
  }

  /*
   * Also support existing HTML
   * where success content already exists.
   */
  const successText =
    $$(
      "[data-success-message]"
    );

  successText.forEach(
    (element) => {
      element.textContent =
        "Thank you for sharing. Your feeling has been heard.";
    }
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   ERROR
   ========================================================= */

function showSubmitError(
  error
) {
  let message =
    "We couldn't submit your feedback. Please try again.";

  if (
    !navigator.onLine
  ) {
    message =
      "You appear to be offline. Please check your internet connection and try again.";
  }

  let element =
    $("#submitError");

  if (!element) {
    element =
      document.createElement("div");

    element.id =
      "submitError";

    element.setAttribute(
      "role",
      "alert"
    );

    element.style.marginTop =
      "12px";

    element.style.textAlign =
      "center";

    const submit =
      $(
        "[data-action='submit'], #submitButton"
      );

    submit?.parentElement
      ?.appendChild(element);
  }

  element.textContent =
    message;
}


/* =========================================================
   LOADING ERROR
   ========================================================= */

function showLoadingError(
  error
) {
  console.warn(
    "Firebase loading error:",
    error
  );

  /*
   * We don't destroy the form.
   * The fallback questions remain available.
   */
  state.questions =
    getDefaultQuestions();

  setupExistingUI();
  setupQuestionFlow();
  setupTypingAnalytics();
  showQuestion(0);
}


/* =========================================================
   START TYPING ANALYTICS
   ========================================================= */

setupTypingAnalytics();
