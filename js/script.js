/* =========================================================
RUDRA BHAKTI — FEEDBACK FORM
Frontend Controller
========================================================= */

(() => {
"use strict";

/* =======================================================
CONFIGURATION
======================================================= */

const CONFIG = {
reelId: "RB001",
reelTitle: "Shiva & Parvati — Eternal Love",
totalQuestions: 5,

```
// Future Firebase integration can use this object.
firebaseReady: false
```

};

/* =======================================================
DOM REFERENCES
======================================================= */

const questionPages = Array.from(
document.querySelectorAll(".question-page")
);

const progressLabel =
document.querySelector(".progress-label");

const progressPercent =
document.querySelector(".progress-percent");

const progressBar =
document.querySelector(".progress-bar");

const successScreen =
document.querySelector(".success-screen");

const questionCard =
document.querySelector(".question-card");

const backButton =
document.querySelector(".back-btn");

const nextButton =
document.querySelector(".next-btn");

const submitButton =
document.querySelector(".submit-btn");

const validationMessage =
document.querySelector(".validation-message");

/* =======================================================
STATE
======================================================= */

let currentStep = 0;

const answers = {};

const questionTiming = {};

const engagement = {
nextClicks: 0,
backClicks: 0,
optionChanges: 0,
questionViews: 0,
startedAt: null,
completedAt: null,
totalDurationMs: 0
};

let sessionId = createSessionId();

let currentQuestionStartedAt = null;

/* =======================================================
SESSION ID
======================================================= */

function createSessionId() {
const timestamp = Date.now().toString(36);

```
const randomPart =
  Math.random().toString(36).substring(2, 10);

return `RB_SESSION_${timestamp}_${randomPart}`;
```

}

/* =======================================================
TIME HELPERS
======================================================= */

function now() {
return Date.now();
}

function startQuestionTimer(questionId) {
currentQuestionStartedAt = now();

```
if (!questionTiming[questionId]) {
  questionTiming[questionId] = {
    questionId,
    viewedAt: new Date().toISOString(),
    answeredAt: null,
    durationMs: 0
  };
}

engagement.questionViews += 1;
```

}

function stopQuestionTimer() {
if (
!questionPages[currentStep] ||
!currentQuestionStartedAt
) {
return;
}

```
const questionId =
  questionPages[currentStep].dataset.questionId;

if (!questionId) {
  return;
}

const duration =
  Math.max(0, now() - currentQuestionStartedAt);

if (!questionTiming[questionId]) {
  questionTiming[questionId] = {
    questionId,
    viewedAt: new Date().toISOString(),
    answeredAt: null,
    durationMs: 0
  };
}

questionTiming[questionId].durationMs += duration;

currentQuestionStartedAt = null;
```

}

function markQuestionAnswered(questionId) {
if (!questionTiming[questionId]) {
questionTiming[questionId] = {
questionId,
viewedAt: new Date().toISOString(),
answeredAt: null,
durationMs: 0
};
}

```
if (!questionTiming[questionId].answeredAt) {
  questionTiming[questionId].answeredAt =
    new Date().toISOString();
}
```

}

/* =======================================================
FORM START
======================================================= */

function startForm() {
engagement.startedAt = new Date().toISOString();

```
currentQuestionStartedAt = now();

if (questionPages.length > 0) {
  const firstQuestionId =
    questionPages[0].dataset.questionId;

  questionTiming[firstQuestionId] = {
    questionId: firstQuestionId,
    viewedAt: new Date().toISOString(),
    answeredAt: null,
    durationMs: 0
  };

  engagement.questionViews = 1;
}
```

}

/* =======================================================
PROGRESS
======================================================= */

function updateProgress() {
const currentNumber = currentStep + 1;
const total = questionPages.length;

```
const percentage =
  Math.round((currentNumber / total) * 100);

if (progressLabel) {
  progressLabel.textContent =
    `Question ${currentNumber} of ${total}`;
}

if (progressPercent) {
  progressPercent.textContent =
    `${percentage}%`;
}

if (progressBar) {
  progressBar.style.width =
    `${percentage}%`;
}
```

}

/* =======================================================
BUTTON STATE
======================================================= */

function updateNavigation() {
const isFirst =
currentStep === 0;

```
const isLast =
  currentStep === questionPages.length - 1;

if (backButton) {
  backButton.style.visibility =
    isFirst ? "hidden" : "visible";
}

if (nextButton) {
  nextButton.classList.toggle(
    "hidden",
    isLast
  );
}

if (submitButton) {
  submitButton.classList.toggle(
    "hidden",
    !isLast
  );
}
```

}

/* =======================================================
SHOW QUESTION
======================================================= */

function showQuestion(index, direction = "next") {
if (
index < 0 ||
index >= questionPages.length
) {
return;
}

```
stopQuestionTimer();

questionPages.forEach((page) => {
  page.classList.remove("active");
});

currentStep = index;

const currentPage =
  questionPages[currentStep];

currentPage.classList.add("active");

const questionId =
  currentPage.dataset.questionId;

if (questionId) {
  startQuestionTimer(questionId);
}

updateProgress();
updateNavigation();
clearValidation();

window.scrollTo({
  top: 0,
  behavior: "smooth"
});
```

}

/* =======================================================
VALIDATION
======================================================= */

function getCurrentQuestionId() {
if (!questionPages[currentStep]) {
return null;
}

```
return questionPages[currentStep]
  .dataset.questionId || null;
```

}

function validateCurrentQuestion() {
const questionId =
getCurrentQuestionId();

```
if (!questionId) {
  return true;
}

const page =
  questionPages[currentStep];

/*
  Q001, Q002 and Q003 use selectable options.
  Q004 uses rating.
  Q005 is written feedback.

  We keep Q005 optional.
*/

if (
  questionId === "Q001" ||
  questionId === "Q002" ||
  questionId === "Q003"
) {
  const answer =
    answers[questionId];

  if (!answer || !answer.optionId) {
    showValidation(
      "Please select an option to continue."
    );

    return false;
  }
}

if (questionId === "Q004") {
  const answer =
    answers[questionId];

  if (
    !answer ||
    typeof answer.rating !== "number"
  ) {
    showValidation(
      "Please select a rating to continue."
    );

    return false;
  }
}

return true;
```

}

function showValidation(message) {
if (!validationMessage) {
return;
}

```
validationMessage.textContent = message;
validationMessage.classList.add("show");
```

}

function clearValidation() {
if (!validationMessage) {
return;
}

```
validationMessage.textContent = "";
validationMessage.classList.remove("show");
```

}

/* =======================================================
OPTION SELECTION
======================================================= */

function handleOptionSelection(option) {
const page =
option.closest(".question-page");

```
if (!page) {
  return;
}

const questionId =
  page.dataset.questionId;

const optionId =
  option.dataset.optionId;

if (!questionId || !optionId) {
  return;
}

const optionTextElement =
  option.querySelector(".option-text");

const optionText =
  optionTextElement
    ? optionTextElement.textContent.trim()
    : option.textContent.trim();

const previous =
  answers[questionId];

if (
  previous &&
  previous.optionId !== optionId
) {
  engagement.optionChanges += 1;
}

answers[questionId] = {
  questionId,
  optionId,
  value: optionText,
  selectedAt: new Date().toISOString()
};

page
  .querySelectorAll(".option")
  .forEach((item) => {
    item.classList.remove("selected");
  });

option.classList.add("selected");

markQuestionAnswered(questionId);

clearValidation();
```

}

/* =======================================================
RADIO SELECTION
======================================================= */

function handleRadioSelection(option) {
const page =
option.closest(".question-page");

```
if (!page) {
  return;
}

const questionId =
  page.dataset.questionId;

const optionId =
  option.dataset.optionId;

if (!questionId || !optionId) {
  return;
}

const textElement =
  option.querySelector(".radio-text");

const optionText =
  textElement
    ? textElement.textContent.trim()
    : option.textContent.trim();

const previous =
  answers[questionId];

if (
  previous &&
  previous.optionId !== optionId
) {
  engagement.optionChanges += 1;
}

answers[questionId] = {
  questionId,
  optionId,
  value: optionText,
  selectedAt: new Date().toISOString()
};

page
  .querySelectorAll(".radio-option")
  .forEach((item) => {
    item.classList.remove("selected");
  });

option.classList.add("selected");

markQuestionAnswered(questionId);

clearValidation();
```

}

/* =======================================================
RATING
======================================================= */

function handleRating(ratingElement) {
const page =
ratingElement.closest(".question-page");

```
if (!page) {
  return;
}

const questionId =
  page.dataset.questionId;

const value =
  Number(ratingElement.dataset.rating);

if (
  !questionId ||
  !Number.isFinite(value)
) {
  return;
}

const previous =
  answers[questionId];

if (
  previous &&
  previous.rating !== value
) {
  engagement.optionChanges += 1;
}

answers[questionId] = {
  questionId,
  rating: value,
  selectedAt: new Date().toISOString()
};

page
  .querySelectorAll(".rating")
  .forEach((item) => {
    item.classList.remove("selected");
  });

ratingElement.classList.add("selected");

markQuestionAnswered(questionId);

clearValidation();
```

}

/* =======================================================
TEXT RESPONSE
======================================================= */

function captureTextResponse(textarea) {
const page =
textarea.closest(".question-page");

```
if (!page) {
  return;
}

const questionId =
  page.dataset.questionId;

if (!questionId) {
  return;
}

answers[questionId] = {
  questionId,
  text: textarea.value.trim(),
  characterCount: textarea.value.length,
  wordCount: countWords(textarea.value),
  capturedAt: new Date().toISOString()
};

if (textarea.value.trim().length > 0) {
  markQuestionAnswered(questionId);
}
```

}

function countWords(text) {
const cleaned =
text.trim();

```
if (!cleaned) {
  return 0;
}

return cleaned.split(/\s+/).length;
```

}

/* =======================================================
NEXT
======================================================= */

function goNext() {
if (!validateCurrentQuestion()) {
return;
}

```
const currentQuestionId =
  getCurrentQuestionId();

if (currentQuestionId) {
  markQuestionAnswered(
    currentQuestionId
  );
}

engagement.nextClicks += 1;

if (
  currentStep <
  questionPages.length - 1
) {
  showQuestion(
    currentStep + 1,
    "next"
  );
}
```

}

/* =======================================================
BACK
======================================================= */

function goBack() {
if (currentStep <= 0) {
return;
}

```
engagement.backClicks += 1;

showQuestion(
  currentStep - 1,
  "back"
);
```

}

/* =======================================================
FINAL RESPONSE
======================================================= */

function buildResponse() {
stopQuestionTimer();

```
engagement.completedAt =
  new Date().toISOString();

if (engagement.startedAt) {
  engagement.totalDurationMs =
    Math.max(
      0,
      new Date(
        engagement.completedAt
      ).getTime() -
        new Date(
          engagement.startedAt
        ).getTime()
    );
}

return {
  feedbackId: createFeedbackId(),

  reelId: CONFIG.reelId,

  sessionId,

  answers: {
    ...answers
  },

  questionTiming: {
    ...questionTiming
  },

  engagement: {
    ...engagement
  },

  device: getDeviceInformation(),

  startedAt: engagement.startedAt,

  completedAt: engagement.completedAt,

  totalDurationMs:
    engagement.totalDurationMs,

  submittedAt:
    new Date().toISOString()
};
```

}

/* =======================================================
FEEDBACK ID
======================================================= */

function createFeedbackId() {
const timestamp =
Date.now().toString(36);

```
const random =
  Math.random()
    .toString(36)
    .substring(2, 8);

return `RB_FB_${timestamp}_${random}`;
```

}

/* =======================================================
DEVICE INFORMATION
======================================================= */

function getDeviceInformation() {
const width =
window.innerWidth;

```
let deviceType = "desktop";

if (width <= 600) {
  deviceType = "mobile";
} else if (width <= 1024) {
  deviceType = "tablet";
}

return {
  deviceType,

  screenWidth:
    window.screen
      ? window.screen.width
      : null,

  screenHeight:
    window.screen
      ? window.screen.height
      : null,

  viewportWidth:
    window.innerWidth,

  viewportHeight:
    window.innerHeight,

  language:
    navigator.language || null,

  platform:
    navigator.platform || null,

  userAgent:
    navigator.userAgent || null
};
```

}

/* =======================================================
SUBMIT
======================================================= */

function submitFeedback() {
if (!validateCurrentQuestion()) {
return;
}

```
const response =
  buildResponse();

/*
  Firebase will be connected here later.

  For now we keep the final response
  locally so the frontend can be tested
  without any backend.
*/

try {
  sessionStorage.setItem(
    "rudraBhaktiLastFeedback",
    JSON.stringify(response)
  );
} catch (error) {
  console.warn(
    "Could not store local feedback:",
    error
  );
}

console.log(
  "Rudra Bhakti Feedback:",
  response
);

showSuccessScreen();
```

}

/* =======================================================
SUCCESS SCREEN
======================================================= */

function showSuccessScreen() {
stopQuestionTimer();

```
questionPages.forEach((page) => {
  page.classList.remove("active");
});

if (questionCard) {
  questionCard.classList.add("hidden");
}

const progressArea =
  document.querySelector(
    ".progress-area"
  );

if (progressArea) {
  progressArea.classList.add("hidden");
}

if (successScreen) {
  successScreen.classList.remove(
    "hidden"
  );

  successScreen.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
```

}

/* =======================================================
HINDI TEXT TO SPEECH
======================================================= */

function speakHindi(button) {
if (
!("speechSynthesis" in window)
) {
return;
}

```
const text =
  button.dataset.speak;

if (!text) {
  return;
}

window.speechSynthesis.cancel();

const utterance =
  new SpeechSynthesisUtterance(
    text
  );

utterance.lang = "hi-IN";
utterance.rate = 0.9;
utterance.pitch = 1;

window.speechSynthesis.speak(
  utterance
);
```

}

/* =======================================================
EVENT LISTENERS
======================================================= */

function bindEvents() {
/* Option buttons */

```
document
  .querySelectorAll(".option")
  .forEach((option) => {
    option.addEventListener(
      "click",
      () => {
        handleOptionSelection(
          option
        );
      }
    );
  });

/* Radio options */

document
  .querySelectorAll(".radio-option")
  .forEach((option) => {
    option.addEventListener(
      "click",
      () => {
        handleRadioSelection(
          option
        );
      }
    );
  });

/* Ratings */

document
  .querySelectorAll(".rating")
  .forEach((rating) => {
    rating.addEventListener(
      "click",
      () => {
        handleRating(rating);
      }
    );
  });

/* Textarea */

document
  .querySelectorAll(
    ".feedback-textarea"
  )
  .forEach((textarea) => {
    textarea.addEventListener(
      "input",
      () => {
        captureTextResponse(
          textarea
        );
      }
    );

    textarea.addEventListener(
      "blur",
      () => {
        captureTextResponse(
          textarea
        );
      }
    );
  });

/* Voice buttons */

document
  .querySelectorAll(".voice-btn")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        speakHindi(button);
      }
    );
  });

/* Navigation */

if (nextButton) {
  nextButton.addEventListener(
    "click",
    goNext
  );
}

if (backButton) {
  backButton.addEventListener(
    "click",
    goBack
  );
}

if (submitButton) {
  submitButton.addEventListener(
    "click",
    submitFeedback
  );
}

/* Keyboard navigation */

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Enter" &&
      event.target.tagName !==
        "TEXTAREA"
    ) {
      event.preventDefault();

      if (
        !nextButton?.classList.contains(
          "hidden"
        )
      ) {
        goNext();
      } else if (
        !submitButton?.classList.contains(
          "hidden"
        )
      ) {
        submitFeedback();
      }
    }

    if (
      event.key === "Escape"
    ) {
      window.speechSynthesis?.cancel();
    }
  }
);

/* Prevent accidental page exit
   only after the user starts typing. */

window.addEventListener(
  "beforeunload",
  (event) => {
    const hasProgress =
      Object.keys(answers).length >
      0;

    if (
      hasProgress &&
      !engagement.completedAt
    ) {
      event.preventDefault();
      event.returnValue = "";
    }
  }
);
```

}

/* =======================================================
INITIALIZE
======================================================= */

function init() {
if (
!questionPages.length
) {
console.error(
"No question pages found."
);

```
  return;
}

startForm();

bindEvents();

questionPages.forEach(
  (page) => {
    page.classList.remove(
      "active"
    );
  }
);

questionPages[0].classList.add(
  "active"
);

updateProgress();
updateNavigation();
```

}

/* =======================================================
START
======================================================= */

if (
document.readyState ===
"loading"
) {
document.addEventListener(
"DOMContentLoaded",
init
);
} else {
init();
}

})();
