/* =====================================================
   RUDRA BHAKTI FEEDBACK
   Firebase Realtime Database + Analytics
===================================================== */

import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAnalytics,
  logEvent
}
from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";

import {
  getDatabase,
  ref,
  push,
  set,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";


/* =====================================================
   FIREBASE CONFIG
===================================================== */

const firebaseConfig = {

  apiKey:
    "AIzaSyAoPVLSklKARDfdDoSm6L2zkj1kabJVpsw",

  authDomain:
    "rudrabhakti-a1d3e.firebaseapp.com",

  projectId:
    "rudrabhakti-a1d3e",

  storageBucket:
    "rudrabhakti-a1d3e.firebasestorage.app",

  messagingSenderId:
    "96491326088",

  appId:
    "1:96491326088:web:16b33c95f6aa67b5936d3d",

  measurementId:
    "G-RYKGBGSLVB",

  databaseURL:
    "https://rudrabhakti-a1d3e-default-rtdb.firebaseio.com/"

};


const app =
  initializeApp(firebaseConfig);

const analytics =
  getAnalytics(app);

const database =
  getDatabase(app);


/* =====================================================
   REEL SYSTEM
===================================================== */

const params =
  new URLSearchParams(
    window.location.search
  );

const contentId =
  params.get("reel") || "RB001";


/*
  Add future Reels here.

  Example:

  RB002:{
    title:"Your next Reel",
    facebookUrl:"https://www.facebook.com/...",
    thumbnail:"images/rb002.jpg"
  }
*/

const reels = {

  RB001:{
    title:
      "Shiva & Parvati — Eternal Love",

    facebookUrl:
      "",

    thumbnail:
      ""
  }

};


const reel =
  reels[contentId] || reels.RB001;


document.getElementById(
  "reelTitle"
).textContent =
  reel.title;


document.getElementById(
  "reelId"
).textContent =
  "RUDRA • " + contentId;


if(reel.facebookUrl){

  const link =
    document.getElementById(
      "reelLink"
    );

  link.href =
    reel.facebookUrl;

}else{

  document.getElementById(
    "reelLink"
  ).style.display =
    "none";

}


if(reel.thumbnail){

  const image =
    document.getElementById(
      "reelImage"
    );

  image.src =
    reel.thumbnail;

  image.style.display =
    "block";

  document.getElementById(
    "reelPlaceholder"
  ).style.display =
    "none";

}


/* =====================================================
   FEEDBACK STATE
===================================================== */

let currentQuestion = 1;

const totalQuestions = 5;

let submitting = false;

const answers = {};


/* =====================================================
   ANALYTICS
===================================================== */

function track(
  eventName,
  parameters = {}
){

  try{

    logEvent(
      analytics,
      eventName,
      {
        content_id:
          contentId,

        feedback_version:
          "1.0",

        ...parameters
      }
    );

  }catch(error){

    console.warn(
      "Analytics error:",
      error
    );

  }

}


track(
  "feedback_started"
);


/* =====================================================
   OPTION SELECTION
===================================================== */

document
.querySelectorAll(".option")
.forEach(option => {

  option.addEventListener(
    "click",
    () => {

      const questionId =
        option.dataset.questionId;

      const optionId =
        option.dataset.optionId;


      document
      .querySelectorAll(
        `.option[data-question-id="${questionId}"]`
      )
      .forEach(item => {

        item.classList.remove(
          "selected"
        );

      });


      option.classList.add(
        "selected"
      );


      answers[questionId] =
        optionId;


      track(
        "feedback_question_answered",
        {
          question_id:
            questionId,

          option_id:
            optionId,

          question_number:
            currentQuestion
        }
      );

    }
  );

});


/* =====================================================
   RATING
===================================================== */

document
.querySelectorAll(".rate")
.forEach(rate => {

  rate.addEventListener(
    "click",
    () => {

      const questionId =
        rate.dataset.questionId;

      const optionId =
        rate.dataset.optionId;


      document
      .querySelectorAll(".rate")
      .forEach(item => {

        item.classList.remove(
          "selected"
        );

      });


      rate.classList.add(
        "selected"
      );


      answers[questionId] =
        optionId;


      track(
        "feedback_question_answered",
        {
          question_id:
            questionId,

          option_id:
            optionId,

          question_number:
            currentQuestion
        }
      );

    }
  );

});


/* =====================================================
   HINDI TEXT-TO-SPEECH
===================================================== */

document
.querySelectorAll(".voice")
.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const text =
        button.dataset.hindi;

      speakHindi(
        button,
        text
      );

    }
  );

});


function speakHindi(
  button,
  text
){

  if(
    !("speechSynthesis" in window)
  ){

    showStatus(
      "Hindi voice is not supported on this device.",
      true
    );

    return;

  }


  speechSynthesis.cancel();


  document
  .querySelectorAll(".voice")
  .forEach(btn => {

    btn.classList.remove(
      "playing"
    );

  });


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


  button.classList.add(
    "playing"
  );


  utterance.onend =
    () => {

      button.classList.remove(
        "playing"
      );

    };


  speechSynthesis.speak(
    utterance
  );

}


/* =====================================================
   VALIDATION
===================================================== */

function validateCurrentQuestion(){

  if(
    currentQuestion === 1 &&
    !answers.Q_FEELING
  ){

    showStatus(
      "Please select how this Reel made you feel.",
      true
    );

    return false;

  }


  if(
    currentQuestion === 2 &&
    !answers.Q_MORE_CONTENT
  ){

    showStatus(
      "Please choose one option to continue.",
      true
    );

    return false;

  }


  if(
    currentQuestion === 3 &&
    !answers.Q_CONNECTION
  ){

    showStatus(
      "Please choose what connected with you most.",
      true
    );

    return false;

  }


  if(
    currentQuestion === 4 &&
    !answers.Q_RATING
  ){

    showStatus(
      "Please give the Reel a rating.",
      true
    );

    return false;

  }


  return true;

}


/* =====================================================
   NEXT
===================================================== */

document
.getElementById("nextBtn")
.addEventListener(
  "click",
  () => {

    if(
      !validateCurrentQuestion()
    ){

      return;

    }


    if(
      currentQuestion ===
      totalQuestions
    ){

      submitFeedback();

      return;

    }


    currentQuestion++;

    showQuestion(
      currentQuestion
    );

  }
);


/* =====================================================
   BACK
===================================================== */

document
.getElementById("backBtn")
.addEventListener(
  "click",
  () => {

    if(
      currentQuestion <= 1
    ){

      return;

    }


    currentQuestion--;

    showQuestion(
      currentQuestion
    );

  }
);


/* =====================================================
   SHOW QUESTION
===================================================== */

function showQuestion(
  number
){

  document
  .querySelectorAll(".question-screen")
  .forEach(screen => {

    screen.classList.remove(
      "active"
    );

  });


  const target =
    document.querySelector(
      `.question-screen[data-question="${number}"]`
    );


  if(target){

    target.classList.add(
      "active"
    );

  }


  document.getElementById(
    "progressNumber"
  ).textContent =
    number +
    " / " +
    totalQuestions;


  document.getElementById(
    "progressFill"
  ).style.width =
    ((number / totalQuestions) * 100) +
    "%";


  document.getElementById(
    "backBtn"
  ).disabled =
    number === 1;


  document.getElementById(
    "nextBtn"
  ).textContent =
    number === totalQuestions
      ? "Submit Feedback"
      : "Continue";


  clearStatus();


  document
  .getElementById("questionCard")
  .scrollIntoView({
    behavior:"smooth",
    block:"center"
  });

}


/* =====================================================
   SUBMIT
===================================================== */

async function submitFeedback(){

  if(submitting){

    return;

  }


  submitting = true;


  const button =
    document.getElementById(
      "nextBtn"
    );


  button.disabled =
    true;

  button.textContent =
    "Submitting...";


  clearStatus();


  const writtenFeedback =
    document
    .getElementById("message")
    .value
    .trim();


  /*
    IMPORTANT:

    Stable IDs are deliberately stored.
    The future analytics dashboard can
    aggregate these IDs directly.
  */

  const response = {

    content_id:
      contentId,

    schema_version:
      "1.0",

    answers:{

      Q_FEELING:
        answers.Q_FEELING || null,

      Q_MORE_CONTENT:
        answers.Q_MORE_CONTENT || null,

      Q_CONNECTION:
        answers.Q_CONNECTION || null,

      Q_RATING:
        answers.Q_RATING || null,

      Q_OPEN_FEEDBACK:
        writtenFeedback || null

    },

    submitted_at:
      serverTimestamp()

  };


  try{

    const responsesRef =
      ref(
        database,
        "feedback_responses/" +
        contentId
      );


    const newResponseRef =
      push(
        responsesRef
      );


    await set(
      newResponseRef,
      response
    );


    track(
      "feedback_completed",
      {
        rating:
          answers.Q_RATING || null
      }
    );


    showSuccess();


  }catch(error){

    console.error(
      "Firebase submission error:",
      error
    );


    showStatus(
      "We couldn't submit your feedback right now. Please try again.",
      true
    );


    submitting =
      false;


    button.disabled =
      false;


    button.textContent =
      "Submit Feedback";

  }

}


/* =====================================================
   SUCCESS SCREEN
===================================================== */

function showSuccess(){

  document.getElementById(
    "questionCard"
  ).style.display =
    "none";


  document.getElementById(
    "navigation"
  ).style.display =
    "none";


  document.getElementById(
    "progressArea"
  ).style.display =
    "none";


  document.getElementById(
    "success"
  ).style.display =
    "block";


  let message =
    "Your feedback has been received. Your feelings help Rudra Bhakti understand what truly resonates with you.";


  if(
    answers.Q_FEELING ===
    "FEEL_PEACEFUL"
  ){

    message =
      "We're glad this Reel brought you a sense of peace. Your response helps us create more moments like this.";

  }


  else if(
    answers.Q_FEELING ===
    "FEEL_EMOTIONAL"
  ){

    message =
      "Thank you for sharing that emotion with us. Your response helps us create more meaningful devotional moments.";

  }


  else if(
    answers.Q_FEELING ===
    "FEEL_DEVOTIONAL"
  ){

    message =
      "Thank you for sharing your devotional feeling. It helps us understand what connects with our community.";

  }


  document.getElementById(
    "successMessage"
  ).textContent =
    message;

}


/* =====================================================
   FACEBOOK SHARE
===================================================== */

document
.getElementById("shareFacebook")
.addEventListener(
  "click",
  () => {

    track(
      "facebook_share_clicked"
    );


    const shareUrl =
      "https://www.facebook.com/sharer/sharer.php?u=" +
      encodeURIComponent(
        window.location.href
      );


    window.open(
      shareUrl,
      "_blank",
      "width=650,height=550"
    );

  }
);


/* =====================================================
   STATUS
===================================================== */

function showStatus(
  message,
  error = false
){

  const status =
    document.getElementById(
      "status"
    );


  status.textContent =
    message;


  status.className =
    "status" +
    (error ? " error" : "");


  status.style.display =
    "block";

}


function clearStatus(){

  const status =
    document.getElementById(
      "status"
    );


  status.textContent =
    "";

  status.style.display =
    "none";

}
