import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  push,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";


/* =========================================
   FIREBASE CONFIG
   ========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyAoPVLSklKARDfdDoSm6L2zkj1kabJVpsw",
  authDomain: "rudrabhakti-a1d3e.firebaseapp.com",
  databaseURL: "https://rudrabhakti-a1d3e-default-rtdb.firebaseio.com/",
  projectId: "rudrabhakti-a1d3e",
  storageBucket: "rudrabhakti-a1d3e.firebasestorage.app",
  messagingSenderId: "96491326088",
  appId: "1:96491326088:web:16b33c95f6aa67b5936d3d",
  measurementId: "G-RYKGBGSLVB"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


/* =========================================
   CONFIG
   ========================================= */

const SCHEMA_VERSION = "1.1";

const DEFAULT_REEL_ID = "RB001";

const QUESTIONS = [
  {
    id: "Q_FEELING",

    label: "YOUR FEELING",

    title: "How did this Reel make you feel?",

    hint: "Choose the option that best describes your feeling.",

    hindi:
      "इस रील को देखकर आपको कैसा महसूस हुआ?",

    type: "choice",

    options: [
      {
        id: "FEEL_PEACEFUL",
        title: "Peaceful",
        description: "It brought a sense of peace."
      },
      {
        id: "FEEL_DEVOTIONAL",
        title: "Devotional",
        description: "It deepened your devotional feeling."
      },
      {
        id: "FEEL_EMOTIONAL",
        title: "Emotional",
        description: "It touched you emotionally."
      },
      {
        id: "FEEL_INSPIRED",
        title: "Inspired",
        description: "It left you feeling inspired."
      },
      {
        id: "FEEL_CALM",
        title: "Calm",
        description: "It helped you feel calm and relaxed."
      },
      {
        id: "FEEL_DEEPLY_MOVED",
        title: "Deeply moved",
        description: "It touched you on a deeper level."
      }
    ]
  },

  {
    id: "Q_MORE_CONTENT",

    label: "CONTENT PREFERENCE",

    title: "Would you like to see more content like this?",

    hint: "Tell us how strongly you would like to see more.",

    hindi:
      "क्या आप इस तरह का और कंटेंट देखना चाहेंगे?",

    type: "choice",

    options: [
      {
        id: "MORE_DEFINITELY",
        title: "Definitely",
        description: "I would love to see more."
      },
      {
        id: "MORE_SOMETIMES",
        title: "Sometimes",
        description: "I would enjoy this occasionally."
      },
      {
        id: "MORE_UNSURE",
        title: "Not sure",
        description: "I am still deciding."
      },
      {
        id: "MORE_NOT_REALLY",
        title: "Not really",
        description: "I would prefer different content."
      }
    ]
  },

  {
    id: "Q_CONNECTION",

    label: "YOUR CONNECTION",

    title: "What connected with you the most?",

    hint: "Choose the part that resonated with you most.",

    hindi:
      "इस रील में आपको सबसे ज्यादा क्या जुड़ा हुआ महसूस हुआ?",

    type: "choice",

    options: [
      {
        id: "CONNECT_SHIVA_PARVATI",
        title: "Shiva & Parvati",
        description: "Their presence and divine bond."
      },
      {
        id: "CONNECT_DEVOTIONAL_FEELING",
        title: "Devotional feeling",
        description: "The spiritual feeling of the Reel."
      },
      {
        id: "CONNECT_ARTWORK",
        title: "Artwork",
        description: "The visual art and presentation."
      },
      {
        id: "CONNECT_MUSIC",
        title: "Music",
        description: "The music and overall atmosphere."
      },
      {
        id: "CONNECT_EVERYTHING",
        title: "Everything",
        description: "The complete experience connected with me."
      }
    ]
  },

  {
    id: "Q_RATING",

    label: "YOUR RATING",

    title: "How would you rate this Reel?",

    hint: "Choose a rating from 1 to 5.",

    hindi:
      "आप इस रील को कितने अंक देंगे?",

    type: "choice",

    options: [
      {
        id: "RATING_1",
        title: "1 — Poor",
        description: "It did not meet my expectations."
      },
      {
        id: "RATING_2",
        title: "2 — Fair",
        description: "It could be improved."
      },
      {
        id: "RATING_3",
        title: "3 — Good",
        description: "A good overall experience."
      },
      {
        id: "RATING_4",
        title: "4 — Very good",
        description: "I really enjoyed it."
      },
      {
        id: "RATING_5",
        title: "5 — Excellent",
        description: "I absolutely loved it."
      }
    ]
  },

  {
    id: "Q_OPEN_FEEDBACK",

    label: "YOUR THOUGHTS",

    title: "Is there anything you'd like to share?",

    hint: "Your thoughts can help us create better content.",

    hindi:
      "क्या आप हमारे साथ कुछ और साझा करना चाहेंगे?",

    type: "text",

    options: []
  }
];


/* =========================================
   STATE
   ========================================= */

const state = {
  reelId: null,
  reel: null,

  currentQuestionIndex: 0,

  answers: {},

  user: {
    name: "",
    email: "",
    mobile: ""
  },

  started: false,
  submitting: false
};


/* =========================================
   DOM
   ========================================= */

const welcomeScreen =
  document.getElementById("welcomeScreen");

const feedbackScreen =
  document.getElementById("feedbackScreen");

const submittingScreen =
  document.getElementById("submittingScreen");

const thankYouScreen =
  document.getElementById("thankYouScreen");

const errorScreen =
  document.getElementById("errorScreen");


const userDetailsForm =
  document.getElementById("userDetailsForm");

const userName =
  document.getElementById("userName");

const userEmail =
  document.getElementById("userEmail");

const userMobile =
  document.getElementById("userMobile");


const nameError =
  document.getElementById("nameError");

const emailError =
  document.getElementById("emailError");

const mobileError =
  document.getElementById("mobileError");


const reelPreview =
  document.getElementById("reelPreview");

const reelThumbnail =
  document.getElementById("reelThumbnail");

const reelTitle =
  document.getElementById("reelTitle");


const questionCounter =
  document.getElementById("questionCounter");

const progressPercent =
  document.getElementById("progressPercent");

const progressBar =
  document.getElementById("progressBar");

const questionLabel =
  document.getElementById("questionLabel");

const questionTitle =
  document.getElementById("questionTitle");

const questionHint =
  document.getElementById("questionHint");

const answerOptions =
  document.getElementById("answerOptions");

const textAnswerContainer =
  document.getElementById("textAnswerContainer");

const openFeedback =
  document.getElementById("openFeedback");

const characterCount =
  document.getElementById("characterCount");

const voiceButton =
  document.getElementById("voiceButton");

const backButton =
  document.getElementById("backButton");

const continueButton =
  document.getElementById("continueButton");

const facebookShareButton =
  document.getElementById("facebookShareButton");

const retryButton =
  document.getElementById("retryButton");

const errorMessage =
  document.getElementById("errorMessage");


/* =========================================
   SCREEN CONTROL
   ========================================= */

function showScreen(screen) {
  [
    welcomeScreen,
    feedbackScreen,
    submittingScreen,
    thankYouScreen,
    errorScreen
  ].forEach((item) => {
    item.classList.add("hidden");
    item.classList.remove("active");
  });

  screen.classList.remove("hidden");
  screen.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================
   REEL ID
   ========================================= */

function getReelIdFromUrl() {
  const params =
    new URLSearchParams(window.location.search);

  const reelId =
    params.get("reel");

  if (!reelId) {
    return DEFAULT_REEL_ID;
  }

  return reelId
    .trim()
    .toUpperCase();
}


/* =========================================
   LOAD REEL
   ========================================= */

async function loadReel() {
  state.reelId =
    getReelIdFromUrl();

  try {
    const reelRef =
      ref(
        db,
        `reels/${state.reelId}`
      );

    const snapshot =
      await get(reelRef);

    if (snapshot.exists()) {
      state.reel =
        snapshot.val();

      renderReelPreview();
    }
  } catch (error) {
    console.error(
      "Reel loading error:",
      error
    );

    /*
     * The feedback page can still work
     * even if optional Reel metadata
     * cannot be loaded.
     */
  }
}


/* =========================================
   REEL PREVIEW
   ========================================= */

function renderReelPreview() {
  if (!state.reel) {
    return;
  }

  const title =
    state.reel.title ||
    `Rudra Bhakti Reel ${state.reelId}`;

  reelTitle.textContent =
    title;

  if (state.reel.thumbnail) {
    reelThumbnail.src =
      state.reel.thumbnail;

    reelThumbnail.alt =
      title;

    reelPreview.classList.remove(
      "hidden"
    );
  }
}


/* =========================================
   VALIDATION
   ========================================= */

function clearUserErrors() {
  nameError.textContent = "";
  emailError.textContent = "";
  mobileError.textContent = "";

  userName.classList.remove(
    "input-error"
  );

  userEmail.classList.remove(
    "input-error"
  );

  userMobile.classList.remove(
    "input-error"
  );
}


function validateName(value) {
  return (
    value.length >= 2 &&
    value.length <= 100
  );
}


function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(value);
}


function validateMobile(value) {
  const digits =
    value.replace(/\D/g, "");

  return (
    digits.length >= 7 &&
    digits.length <= 15
  );
}


function validateUserDetails() {
  clearUserErrors();

  const name =
    userName.value.trim();

  const email =
    userEmail.value.trim();

  const mobile =
    userMobile.value.trim();

  let valid = true;


  if (!validateName(name)) {
    nameError.textContent =
      "Please enter your name.";

    userName.classList.add(
      "input-error"
    );

    valid = false;
  }


  if (!validateEmail(email)) {
    emailError.textContent =
      "Please enter a valid email address.";

    userEmail.classList.add(
      "input-error"
    );

    valid = false;
  }


  if (!validateMobile(mobile)) {
    mobileError.textContent =
      "Please enter a valid mobile number.";

    userMobile.classList.add(
      "input-error"
    );

    valid = false;
  }


  if (!valid) {
    return false;
  }


  state.user = {
    name,
    email,
    mobile:
      mobile.replace(/\s+/g, "")
  };

  return true;
}


/* =========================================
   USER DETAILS → FEEDBACK
   ========================================= */

function startFeedback() {
  if (!validateUserDetails()) {
    return;
  }

  state.started = true;
  state.currentQuestionIndex = 0;

  renderQuestion();

  showScreen(feedbackScreen);
}


/* =========================================
   QUESTION RENDERING
   ========================================= */

function renderQuestion() {
  const question =
    QUESTIONS[
      state.currentQuestionIndex
    ];

  if (!question) {
    return;
  }

  const total =
    QUESTIONS.length;

  const current =
    state.currentQuestionIndex + 1;

  const percent =
    Math.round(
      (current / total) * 100
    );


  questionCounter.textContent =
    `Question ${current} of ${total}`;

  progressPercent.textContent =
    `${percent}%`;

  progressBar.style.width =
    `${percent}%`;


  questionLabel.textContent =
    question.label;

  questionTitle.textContent =
    question.title;

  questionHint.textContent =
    question.hint;


  renderAnswers(question);

  updateContinueButton();

  updateBackButton();
}


/* =========================================
   ANSWER OPTIONS
   ========================================= */

function renderAnswers(question) {
  answerOptions.innerHTML = "";

  textAnswerContainer.classList.add(
    "hidden"
  );

  if (question.type === "text") {
    renderTextQuestion();
    return;
  }


  question.options.forEach(
    (option) => {
      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "answer-option";

      button.dataset.optionId =
        option.id;


      if (
        state.answers[question.id] ===
        option.id
      ) {
        button.classList.add(
          "selected"
        );
      }


      button.innerHTML = `
        <span class="answer-option-content">
          <span class="answer-option-title">
            ${escapeHtml(option.title)}
          </span>

          <span class="answer-option-description">
            ${escapeHtml(option.description)}
          </span>
        </span>

        <span class="answer-option-check" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m5 12 4 4L19 6"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      `;


      button.addEventListener(
        "click",
        () => {
          selectAnswer(
            question.id,
            option.id
          );
        }
      );


      answerOptions.appendChild(
        button
      );
    }
  );
}


/* =========================================
   TEXT QUESTION
   ========================================= */

function renderTextQuestion() {
  textAnswerContainer.classList.remove(
    "hidden"
  );

  const existing =
    state.answers.Q_OPEN_FEEDBACK;

  openFeedback.value =
    existing || "";

  updateCharacterCount();
}


/* =========================================
   SELECT ANSWER
   ========================================= */

function selectAnswer(
  questionId,
  optionId
) {
  state.answers[questionId] =
    optionId;

  const buttons =
    answerOptions.querySelectorAll(
      ".answer-option"
    );

  buttons.forEach(
    (button) => {
      button.classList.toggle(
        "selected",
        button.dataset.optionId ===
          optionId
      );
    }
  );

  updateContinueButton();
}


/* =========================================
   QUESTION VALIDATION
   ========================================= */

function isCurrentQuestionAnswered() {
  const question =
    QUESTIONS[
      state.currentQuestionIndex
    ];

  if (question.type === "text") {
    return true;
  }

  return Boolean(
    state.answers[question.id]
  );
}


/* =========================================
   CONTINUE BUTTON
   ========================================= */

function updateContinueButton() {
  continueButton.disabled =
    !isCurrentQuestionAnswered();
}


/* =========================================
   BACK BUTTON
   ========================================= */

function updateBackButton() {
  backButton.disabled =
    state.currentQuestionIndex === 0;

  backButton.style.opacity =
    state.currentQuestionIndex === 0
      ? "0.45"
      : "1";

  backButton.style.cursor =
    state.currentQuestionIndex === 0
      ? "not-allowed"
      : "pointer";
}


/* =========================================
   FINALIZE CURRENT QUESTION
   ========================================= */

function finalizeCurrentQuestion() {
  const question =
    QUESTIONS[
      state.currentQuestionIndex
    ];

  if (question.type === "text") {
    state.answers.Q_OPEN_FEEDBACK =
      openFeedback.value.trim() ||
      null;

    return true;
  }

  return Boolean(
    state.answers[question.id]
  );
}


/* =========================================
   NEXT QUESTION
   ========================================= */

function goToNextQuestion() {
  if (
    !finalizeCurrentQuestion()
  ) {
    return;
  }

  if (
    state.currentQuestionIndex <
    QUESTIONS.length - 1
  ) {
    state.currentQuestionIndex += 1;

    renderQuestion();

    return;
  }

  submitFeedback();
}


/* =========================================
   PREVIOUS QUESTION
   ========================================= */

function goToPreviousQuestion() {
  if (
    state.currentQuestionIndex === 0
  ) {
    return;
  }

  finalizeCurrentQuestion();

  state.currentQuestionIndex -= 1;

  renderQuestion();
}


/* =========================================
   CHARACTER COUNT
   ========================================= */

function updateCharacterCount() {
  const length =
    openFeedback.value.length;

  characterCount.textContent =
    length;
}


/* =========================================
   HINDI TTS
   ========================================= */

function speakHindiQuestion() {
  const question =
    QUESTIONS[
      state.currentQuestionIndex
    ];

  if (
    !question ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      question.hindi
    );

  utterance.lang = "hi-IN";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 1;


  utterance.onstart = () => {
    voiceButton.classList.add(
      "speaking"
    );
  };


  utterance.onend = () => {
    voiceButton.classList.remove(
      "speaking"
    );
  };


  utterance.onerror = () => {
    voiceButton.classList.remove(
      "speaking"
    );
  };


  window.speechSynthesis.speak(
    utterance
  );
}


/* =========================================
   SUBMIT FEEDBACK
   ========================================= */

async function submitFeedback() {
  if (state.submitting) {
    return;
  }

  finalizeCurrentQuestion();

  const requiredAnswers = [
    "Q_FEELING",
    "Q_MORE_CONTENT",
    "Q_CONNECTION",
    "Q_RATING"
  ];

  const missing =
    requiredAnswers.some(
      (key) => !state.answers[key]
    );

  if (missing) {
    state.currentQuestionIndex =
      requiredAnswers.findIndex(
        (key) => !state.answers[key]
      );

    renderQuestion();

    return;
  }


  state.submitting = true;

  showScreen(
    submittingScreen
  );


  const responseData = {
    content_id:
      state.reelId,

    schema_version:
      SCHEMA_VERSION,

    user: {
      name: state.user.name,
      email: state.user.email,
      mobile: state.user.mobile
    },

    answers: {
      Q_FEELING:
        state.answers.Q_FEELING,

      Q_MORE_CONTENT:
        state.answers.Q_MORE_CONTENT,

      Q_CONNECTION:
        state.answers.Q_CONNECTION,

      Q_RATING:
        state.answers.Q_RATING,

      Q_OPEN_FEEDBACK:
        state.answers.Q_OPEN_FEEDBACK ||
        null
    },

    submitted_at:
      serverTimestamp()
  };


  try {
    const responsesRef =
      ref(
        db,
        `feedback_responses/${state.reelId}`
      );

    await push(
      responsesRef,
      responseData
    );


    state.submitting = false;

    showScreen(
      thankYouScreen
    );

  } catch (error) {
    console.error(
      "Feedback submission error:",
      error
    );

    state.submitting = false;

    errorMessage.textContent =
      "We could not save your feedback. Please check your connection and try again.";

    showScreen(
      errorScreen
    );
  }
}


/* =========================================
   FACEBOOK SHARE
   ========================================= */

function shareOnFacebook() {
  const shareUrl =
    state.reel?.facebookUrl ||
    window.location.href;

  const facebookUrl =
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;

  window.open(
    facebookUrl,
    "_blank",
    "noopener,noreferrer,width=700,height=600"
  );
}


/* =========================================
   HTML ESCAPING
   ========================================= */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================
   EVENT LISTENERS
   ========================================= */

userDetailsForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    startFeedback();
  }
);


backButton.addEventListener(
  "click",
  () => {
    goToPreviousQuestion();
  }
);


continueButton.addEventListener(
  "click",
  () => {
    goToNextQuestion();
  }
);


voiceButton.addEventListener(
  "click",
  () => {
    speakHindiQuestion();
  }
);


openFeedback.addEventListener(
  "input",
  () => {
    updateCharacterCount();

    state.answers.Q_OPEN_FEEDBACK =
      openFeedback.value.trim() ||
      null;

    updateContinueButton();
  }
);


facebookShareButton.addEventListener(
  "click",
  () => {
    shareOnFacebook();
  }
);


retryButton.addEventListener(
  "click",
  () => {
    window.location.reload();
  }
);


/* =========================================
   INITIALIZE
   ========================================= */

async function initialize() {
  try {
    await loadReel();

    showScreen(
      welcomeScreen
    );

  } catch (error) {
    console.error(
      "Initialization error:",
      error
    );

    errorMessage.textContent =
      "We could not load the feedback page. Please try again.";

    showScreen(
      errorScreen
    );
  }
}


initialize();
