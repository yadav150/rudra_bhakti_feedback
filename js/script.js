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
    questionViews: 0,
    nextClicks: 0,
    backClicks: 0,
    optionChanges: 0,
    abandoned: false
  },

  typing: {},

  startedAt: null,
  completedAt: null,

  questionEnteredAt: null,

  sessionId: null,

  submitted: false
};


/* =========================================================
   FALLBACK QUESTIONS
   ========================================================= */

const FALLBACK_QUESTIONS = [
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
        text: "The Shiva & Parvati emotion"
      },
      {
        optionId: "Q003_O02",
        text: "The devotional feeling"
      },
      {
        optionId: "Q003_O03",
        text: "The artwork / visuals"
      },
      {
        optionId: "Q003_O04",
        text: "The music"
      },
      {
        optionId: "Q003_O05",
        text: "Everything together"
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

    type: "textarea",
    required: false,
    order: 5,
    active: true
  }
];


/* =========================================================
   SESSION ID
   ========================================================= */

function createSessionId() {
  if (
    window.crypto &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return (
    "RB-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}


/* =========================================================
   GET REEL ID FROM URL
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
    "RB0001"
  );
}


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
   INITIALIZE
   ========================================================= */

async function init() {
  state.reelId =
    getReelIdFromURL();

  state.sessionId =
    createSessionId();

  state.startedAt =
    Date.now();

  try {
    /*
     * Load Reel from RTDB.
     */
    state.reel =
      await getReel(
        state.reelId
      );

    /*
     * Load active questions.
     */
    const firebaseQuestions =
      await getActiveQuestions();

    state.questions =
      firebaseQuestions.length
        ? firebaseQuestions
        : FALLBACK_QUESTIONS;

  } catch (error) {
    console.error(
      "Firebase loading error:",
      error
    );

    /*
     * Public form should still work
     * if Firebase question data is unavailable.
     */
    state.questions =
      FALLBACK_QUESTIONS;
  }


  updateReelInformation();

  setupExistingUI();

  setupTypingAnalytics();

  showQuestion(
    state.currentQuestion
  );

  window.addEventListener(
    "beforeunload",
    handleAbandonment
  );
}


/* =========================================================
   REEL INFORMATION
   ========================================================= */

function updateReelInformation() {
  const reel =
    state.reel;

  const title =
    reel?.title ||
    "Shiva & Parvati — Eternal Love";

  const reelId =
    reel?.reelId ||
    state.reelId;

  /*
   * Existing frontend selectors.
   */
  const titleElement =
    document.querySelector(
      "[data-reel-title]"
    ) ||
    document.querySelector(
      ".reel-title"
    );

  if (titleElement) {
    titleElement.textContent =
      title;
  }


  const idElement =
    document.querySelector(
      "[data-reel-id]"
    ) ||
    document.querySelector(
      ".reel-id"
    );

  if (idElement) {
    idElement.textContent =
      reelId;
  }


  const image =
    document.querySelector(
      "[data-reel-thumbnail]"
    ) ||
    document.querySelector(
      ".reel-thumbnail img"
    );

  if (
    image &&
    reel?.thumbnailUrl
  ) {
    image.src =
      reel.thumbnailUrl;
  }
}


/* =========================================================
   QUESTION FLOW
   ========================================================= */

function showQuestion(index) {
  if (
    index < 0 ||
    index >= state.questions.length
  ) {
    return;
  }

  /*
   * Finish timing of previous question.
   */
  if (
    state.questionEnteredAt &&
    state.currentQuestion !== index
  ) {
    recordQuestionTiming();
  }

  state.currentQuestion =
    index;

  state.questionEnteredAt =
    Date.now();

  state.engagement.questionViews++;

  const question =
    state.questions[index];

  /*
   * Hide all question cards.
   */
  const cards =
    $$(".question-card");

  cards.forEach(
    (card) => {
      card.classList.remove(
        "active"
      );
    }
  );


  /*
   * Try stable question ID first.
   */
  let card =
    document.querySelector(
      `[data-question-id="${question.questionId}"]`
    );


  /*
   * Fallback: question cards in DOM order.
   */
  if (!card) {
    card =
      cards[index];
  }

  if (card) {
    card.classList.add(
      "active"
    );
  }


  updateProgress();

  updateNavigation();

  speakQuestion(question);
}


/* =========================================================
   QUESTION TIMING
   ========================================================= */

function recordQuestionTiming() {
  if (
    state.questionEnteredAt === null
  ) {
    return;
  }

  const question =
    state.questions[
      state.currentQuestion
    ];

  if (!question) {
    return;
  }

  const duration =
    Math.max(
      0,
      Date.now() -
        state.questionEnteredAt
    );

  const existing =
    state.questionTiming[
      question.questionId
    ];

  if (existing) {
    existing.totalMs +=
      duration;

    existing.visits += 1;
  } else {
    state.questionTiming[
      question.questionId
    ] = {
      questionId:
        question.questionId,

      totalMs:
        duration,

      visits: 1,

      answerTimeMs: 0
    };
  }
}


/* =========================================================
   ANSWER TIMING
   ========================================================= */

function recordAnswerTiming() {
  const question =
    state.questions[
      state.currentQuestion
    ];

  if (!question) {
    return;
  }

  const timing =
    state.questionTiming[
      question.questionId
    ];

  if (!timing) {
    return;
  }

  timing.answerTimeMs =
    Date.now() -
    state.questionEnteredAt;
}


/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress() {
  const total =
    state.questions.length;

  const current =
    state.currentQuestion + 1;


  const progress =
    total
      ? (current / total) * 100
      : 0;


  const progressBar =
    document.querySelector(
      "[data-progress]"
    );

  if (progressBar) {
    progressBar.style.width =
      `${progress}%`;
  }


  const progressText =
    document.querySelector(
      "[data-progress-text]"
    );

  if (progressText) {
    progressText.textContent =
      `${current} / ${total}`;
  }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function updateNavigation() {
  const backButton =
    document.querySelector(
      "[data-back]"
    ) ||
    document.querySelector(
      ".back-btn"
    );

  const nextButton =
    document.querySelector(
      "[data-next]"
    ) ||
    document.querySelector(
      ".next-btn"
    );


  if (backButton) {
    backButton.disabled =
      state.currentQuestion === 0;
  }


  if (nextButton) {
    const isLast =
      state.currentQuestion ===
      state.questions.length - 1;

    nextButton.textContent =
      isLast
        ? "Share My Feedback"
        : "Next";
  }
}


/* =========================================================
   NEXT QUESTION
   ========================================================= */

function goNext() {
  const question =
    state.questions[
      state.currentQuestion
    ];

  if (!question) {
    return;
  }


  if (
    question.required &&
    !hasAnswer(question)
  ) {
    showValidationMessage(
      "Please select an answer before continuing."
    );

    return;
  }


  recordAnswerTiming();

  state.engagement.nextClicks++;


  if (
    state.currentQuestion ===
    state.questions.length - 1
  ) {
    submit();
    return;
  }


  showQuestion(
    state.currentQuestion + 1
  );
}


/* =========================================================
   PREVIOUS QUESTION
   ========================================================= */

function goBack() {
  if (
    state.currentQuestion <= 0
  ) {
    return;
  }

  recordQuestionTiming();

  state.engagement.backClicks++;

  showQuestion(
    state.currentQuestion - 1
  );
}


/* =========================================================
   ANSWER CHECK
   ========================================================= */

function hasAnswer(
  question
) {
  const answer =
    state.answers[
      question.questionId
    ];

  if (
    answer === undefined ||
    answer === null
  ) {
    return false;
  }

  if (
    typeof answer === "string" &&
    !answer.trim()
  ) {
    return false;
  }

  return true;
}


/* =========================================================
   OPTION SELECTION
   ========================================================= */

function selectOption(
  questionId,
  optionId,
  value
) {
  const previous =
    state.answers[
      questionId
    ];


  if (
    previous !== undefined &&
    previous !== optionId
  ) {
    state.engagement
      .optionChanges++;
  }


  state.answers[
    questionId
  ] = optionId;


  const timing =
    state.questionTiming[
      questionId
    ];

  if (timing) {
    timing.answerTimeMs =
      Date.now() -
      state.questionEnteredAt;
  }


  /*
   * Keep existing UI selection behavior.
   */
  const group =
    document.querySelectorAll(
      `[data-question="${questionId}"]`
    );

  group.forEach(
    (element) => {
      element.classList.toggle(
        "selected",
        element.dataset.optionId ===
          optionId
      );
    }
  );
}


/* =========================================================
   RATING
   ========================================================= */

function selectRating(
  questionId,
  rating
) {
  const previous =
    state.answers[
      questionId
    ];

  if (
    previous !== undefined &&
    previous !== rating
  ) {
    state.engagement
      .optionChanges++;
  }

  state.answers[
    questionId
  ] = Number(rating);


  const stars =
    document.querySelectorAll(
      "[data-rating-value]"
    );

  stars.forEach(
    (star) => {
      const value =
        Number(
          star.dataset.ratingValue
        );

      star.classList.toggle(
        "selected",
        value <=
          Number(rating)
      );
    }
  );
}


/* =========================================================
   TEXT RESPONSE
   ========================================================= */

function saveTextAnswer(
  questionId,
  value
) {
  state.answers[
    questionId
  ] = value;

  updateTypingAnalytics(
    questionId,
    value
  );
}


/* =========================================================
   TYPING ANALYTICS
   ========================================================= */

function setupTypingAnalytics() {
  const textareas =
    $$("textarea");

  textareas.forEach(
    (textarea) => {
      const questionId =
        textarea.dataset.questionId ||
        "Q005";

      let started =
        null;

      textarea.addEventListener(
        "focus",
        () => {
          if (!started) {
            started =
              Date.now();
          }
        }
      );


      textarea.addEventListener(
        "input",
        () => {
          if (!started) {
            started =
              Date.now();
          }

          updateTypingAnalytics(
            questionId,
            textarea.value,
            started
          );
        }
      );


      textarea.addEventListener(
        "blur",
        () => {
          if (!started) {
            return;
          }

          updateTypingAnalytics(
            questionId,
            textarea.value,
            started
          );
        }
      );
    }
  );
}


function updateTypingAnalytics(
  questionId,
  value,
  startedAt = null
) {
  const text =
    String(value || "");


  const words =
    text.trim()
      ? text
          .trim()
          .split(/\s+/)
          .length
      : 0;


  if (
    !state.typing[questionId]
  ) {
    state.typing[
      questionId
    ] = {
      questionId,
      characterCount: 0,
      wordCount: 0,
      editCount: 0,
      writingTimeMs: 0
    };
  }


  const data =
    state.typing[
      questionId
    ];


  if (
    data.characterCount !==
    text.length
  ) {
    data.editCount++;
  }


  data.characterCount =
    text.length;

  data.wordCount =
    words;


  if (startedAt) {
    data.writingTimeMs =
      Math.max(
        0,
        Date.now() -
          startedAt
      );
  }
}


/* =========================================================
   DEVICE DATA
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
      window.screen?.width || null,

    screenHeight:
      window.screen?.height || null,

    viewportWidth:
      window.innerWidth || null,

    viewportHeight:
      window.innerHeight || null,

    devicePixelRatio:
      window.devicePixelRatio || 1,

    timezone:
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone || ""
  };
}


/* =========================================================
   SUBMIT FEEDBACK
   ========================================================= */

async function submit() {
  if (state.submitted) {
    return;
  }


  recordQuestionTiming();


  state.completedAt =
    Date.now();


  state.engagement.abandoned =
    false;


  const totalDurationMs =
    Math.max(
      0,
      state.completedAt -
        state.startedAt
    );


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

    typing:
      state.typing,

    device:
      getDeviceInfo(),

    startedAt:
      state.startedAt,

    completedAt:
      state.completedAt,

    totalDurationMs
  };


  setSubmitLoading(
    true
  );


  try {
    const result =
      await submitFeedback(
        payload
      );

    console.log(
      "Feedback submitted:",
      result
    );


    state.submitted =
      true;

    showSuccess();

  } catch (error) {
    console.error(
      "Feedback submission failed:",
      error
    );

    showSubmitError();

  } finally {
    setSubmitLoading(
      false
    );
  }
}


/* =========================================================
   ABANDONMENT
   ========================================================= */

function handleAbandonment() {
  if (
    state.submitted
  ) {
    return;
  }

  /*
   * This is only kept in memory here.
   * A future server-side/session event system
   * can record true abandoned sessions.
   */
  state.engagement.abandoned =
    true;
}


/* =========================================================
   VALIDATION
   ========================================================= */

function showValidationMessage(
  message
) {
  let element =
    document.querySelector(
      "[data-validation]"
    );

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.classList.add(
    "show"
  );


  setTimeout(
    () => {
      element.classList.remove(
        "show"
      );
    },
    2500
  );
}


/* =========================================================
   SUBMIT LOADING
   ========================================================= */

function setSubmitLoading(
  loading
) {
  const button =
    document.querySelector(
      "[data-submit]"
    ) ||
    document.querySelector(
      ".submit-btn"
    );

  if (!button) {
    return;
  }

  button.disabled =
    loading;

  if (loading) {
    button.dataset
      .originalText =
      button.textContent;

    button.textContent =
      "Saving...";
  } else {
    button.textContent =
      button.dataset
        .originalText ||
      "Share My Feedback";
  }
}


/* =========================================================
   SUCCESS
   ========================================================= */

function showSuccess() {
  const form =
    document.querySelector(
      "[data-feedback-form]"
    ) ||
    document.querySelector(
      ".feedback-form"
    );


  const success =
    document.querySelector(
      "[data-success]"
    ) ||
    document.querySelector(
      ".success"
    );


  if (form) {
    form.style.display =
      "none";
  }

  if (success) {
    success.style.display =
      "block";
  }
}


/* =========================================================
   SUBMIT ERROR
   ========================================================= */

function showSubmitError() {
  alert(
    "We couldn't save your feedback right now. Please try again."
  );
}


/* =========================================================
   HINDI VOICE
   ========================================================= */

function speakQuestion(
  question
) {
  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }


  if (
    !question?.hindiText
  ) {
    return;
  }


  /*
   * Do not automatically speak every
   * question if browser/user has not
   * interacted yet.
   */
}


/**
 * Public helper for existing voice button.
 */
window.speakHindi =
  function (
    questionId
  ) {
    if (
      !("speechSynthesis" in window)
    ) {
      return;
    }


    const question =
      state.questions.find(
        (item) =>
          item.questionId ===
          questionId
      );


    if (!question) {
      return;
    }


    window.speechSynthesis.cancel();


    const utterance =
      new SpeechSynthesisUtterance(
        question.hindiText ||
        question.questionText
      );


    utterance.lang =
      "hi-IN";

    utterance.rate =
      0.9;

    utterance.pitch =
      1;


    window.speechSynthesis
      .speak(
        utterance
      );
  };


/* =========================================================
   EXISTING HTML UI BINDINGS
   ========================================================= */

function setupExistingUI() {

  /*
   * Next buttons.
   */
  $$(
    "[data-next], .next-btn"
  ).forEach(
    (button) => {
      button.addEventListener(
        "click",
        goNext
      );
    }
  );


  /*
   * Back buttons.
   */
  $$(
    "[data-back], .back-btn"
  ).forEach(
    (button) => {
      button.addEventListener(
        "click",
        goBack
      );
    }
  );


  /*
   * Option buttons.
   */
  $$(
    "[data-option-id]"
  ).forEach(
    (element) => {
      element.addEventListener(
        "click",
        () => {

          const optionId =
            element.dataset
              .optionId;

          const questionId =
            element.dataset
              .questionId ||
            element.closest(
              "[data-question-id]"
            )?.dataset
              .questionId;


          if (
            !questionId ||
            !optionId
          ) {
            return;
          }


          selectOption(
            questionId,
            optionId,
            element.dataset
              .value ||
              element.textContent
          );
        }
      );
    }
  );


  /*
   * Rating buttons.
   */
  $$(
    "[data-rating-value]"
  ).forEach(
    (element) => {
      element.addEventListener(
        "click",
        () => {

          const rating =
            Number(
              element.dataset
                .ratingValue
            );


          const questionId =
            element.dataset
              .questionId ||
            "Q004";


          selectRating(
            questionId,
            rating
          );
        }
      );
    }
  );


  /*
   * Textareas.
   */
  $$(
    "textarea"
  ).forEach(
    (textarea) => {

      textarea.addEventListener(
        "input",
        () => {

          const questionId =
            textarea.dataset
              .questionId ||
            "Q005";


          saveTextAnswer(
            questionId,
            textarea.value
          );
        }
      );
    }
  );
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  init
);
