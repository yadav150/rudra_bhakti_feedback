/* ============================================================
   RUDRA BHAKTI — PUBLIC FEEDBACK PAGE
   Phase 3 — Firebase + expanded question set
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getDatabase, ref, get, push, serverTimestamp }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAoPVLSklKARDfdDoSm6L2zkj1kabJVpsw",
    authDomain: "rudrabhakti-a1d3e.firebaseapp.com",
    databaseURL: "https://rudrabhakti-a1d3e-default-rtdb.firebaseio.com",
    projectId: "rudrabhakti-a1d3e",
    storageBucket: "rudrabhakti-a1d3e.firebasestorage.app",
    messagingSenderId: "96491326088",
    appId: "1:96491326088:web:593b15e565a12f57936d3d",
    measurementId: "G-DF9MKJ113R"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ===== REEL LOADING ===== */
const DEFAULT_REEL = {
    id: 'RB001',
    title: 'Shiva & Parvati — Eternal Love',
    url: '',
    thumbnail: ''
};

let activeReel = DEFAULT_REEL;
let reelLoaded = false;

function getReelIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('reel') || params.get('id') || '').trim().toUpperCase();
}

async function loadActiveReel() {
    const id = getReelIdFromURL();
    if (!id) {
        activeReel = DEFAULT_REEL;
        applyReelToPage();
        reelLoaded = true;
        return;
    }
    try {
        const snap = await get(ref(db, 'reels/' + id));
        if (snap.exists()) {
            activeReel = { id, ...snap.val() };
        } else {
            activeReel = { ...DEFAULT_REEL, id };
        }
    } catch (err) {
        console.error('Reel load error:', err);
        activeReel = { ...DEFAULT_REEL, id };
    }
    applyReelToPage();
    reelLoaded = true;
}

function applyReelToPage() {
    const titleEl = document.getElementById('reelTitle');
    const codeEl = document.getElementById('reelCode');
    const thumbEl = document.getElementById('reelThumb');

    if (titleEl && activeReel.title) titleEl.textContent = activeReel.title;
    if (codeEl) codeEl.textContent = 'RUDRA • ' + activeReel.id;

    if (thumbEl && activeReel.thumbnail) {
        thumbEl.innerHTML = '<img src="' + activeReel.thumbnail + '" alt="" />';
    }
}

loadActiveReel();

/* ===== WIZARD STATE ===== */
let currentQuestion = 1;
const totalQuestions = 12;
const answers = {};

const progressNumber = document.getElementById('progressNumber');
const progressFill = document.getElementById('progressFill');
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');
const questionCard = document.getElementById('questionCard');
const success = document.getElementById('success');
const successMessage = document.getElementById('successMessage');
const messageField = document.getElementById('message');
const shareBtn = document.getElementById('shareFacebook');
const nav = document.querySelector('.navigation');
const progressArea = document.querySelector('.progress-area');

/* ===== REQUIRED PER QUESTION ===== */
const REQUIRED = {
    1: 'feeling',
    2: 'more',
    3: 'liked',
    4: 'rating',
    5: 'stoodOut',
    6: 'heldInterest',
    7: 'presentation',
    8: 'improve',
    9: 'wantMore',
    10: 'engageAgain',
    11: 'likedPart'
};

/* ===== OPTIONS ===== */
document.querySelectorAll('.option').forEach((option) => {
    option.addEventListener('click', () => {
        const group = option.dataset.group;
        document.querySelectorAll(`.option[data-group="${group}"]`)
            .forEach((item) => item.classList.remove('selected'));
        option.classList.add('selected');
        answers[group] = option.textContent.replace(/\s+/g, ' ').trim();
    });
});

document.querySelectorAll('.rate').forEach((rate) => {
    rate.addEventListener('click', () => {
        document.querySelectorAll('.rate').forEach((item) => item.classList.remove('selected'));
        rate.classList.add('selected');
        answers.rating = rate.textContent.trim();
    });
});

/* ===== NAVIGATION ===== */
function showQuestion(number) {
    document.querySelectorAll('.question-screen').forEach((s) => s.classList.remove('active'));
    const target = document.querySelector(`.question-screen[data-question="${number}"]`);
    if (target) target.classList.add('active');

    progressNumber.textContent = number + ' / ' + totalQuestions;
    progressFill.style.width = ((number / totalQuestions) * 100) + '%';
    backBtn.disabled = number === 1;
    nextBtn.textContent = number === totalQuestions ? 'Submit Feedback' : 'Continue';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextQuestion() {
    const key = REQUIRED[currentQuestion];
    if (key && !answers[key]) {
        alert('Please make a selection to continue.');
        return;
    }
    if (currentQuestion === totalQuestions) { submitFeedback(); return; }
    currentQuestion++;
    showQuestion(currentQuestion);
}

function previousQuestion() {
    if (currentQuestion <= 1) return;
    currentQuestion--;
    showQuestion(currentQuestion);
}

backBtn.addEventListener('click', previousQuestion);
nextBtn.addEventListener('click', nextQuestion);

/* ===== HINDI TTS ===== */
document.querySelectorAll('.voice').forEach((button) => {
    button.addEventListener('click', () => speakHindi(button, button.dataset.hindi || ''));
});

function speakHindi(button, text) {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
        alert('Hindi voice is not supported on this device.');
        return;
    }
    window.speechSynthesis.cancel();
    document.querySelectorAll('.voice').forEach((b) => b.classList.remove('playing'));
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    button.classList.add('playing');
    utterance.onend = () => button.classList.remove('playing');
    window.speechSynthesis.speak(utterance);
}

/* ===== SUBMIT ===== */
async function submitFeedback() {
    if (!reelLoaded) {
        alert('Reel is still loading. Please try again in a moment.');
        return;
    }

    const rating = Number(answers.rating) || 0;
    if (rating < 1 || rating > 5) {
        alert('Please select a rating between 1 and 5.');
        return;
    }

    const originalLabel = nextBtn.textContent;
    nextBtn.disabled = true;
    nextBtn.textContent = 'Submitting…';

    const feedback = {
        reelId: activeReel.id,
        reelTitle: activeReel.title || '',
        name: 'Anonymous',
        email: 'anonymous@gmail.com',
        isAnonymous: true,
        feeling: answers.feeling || '',
        wouldWatchMore: answers.more || '',
        connectedWith: answers.liked || '',
        rating: rating,
        stoodOut: answers.stoodOut || '',
        heldInterest: answers.heldInterest || '',
        presentation: answers.presentation || '',
        improve: answers.improve || '',
        wantMore: answers.wantMore || '',
        engageAgain: answers.engageAgain || '',
        likedPart: answers.likedPart || '',
        message: (messageField.value || '').trim(),
        submittedAt: serverTimestamp()
    };

    try {
        await push(ref(db, 'feedback'), feedback);
        showSuccess(feedback);
    } catch (err) {
        console.error('Submit error:', err);
        nextBtn.disabled = false;
        nextBtn.textContent = originalLabel;
        alert('Unable to submit right now. Please check your connection and try again.');
    }
}

/* ===== SUCCESS ===== */
function showSuccess(feedback) {
    let msg = 'Your feedback has been received. Your feelings help Rudra Bhakti understand what truly resonates with you.';

    if (feedback.feeling === 'Peaceful') msg = "We're glad this Reel brought you a sense of peace. Your feedback helps us create more moments like this.";
    else if (feedback.feeling === 'Emotional') msg = 'Thank you for sharing that emotion with us. Your response helps us create more meaningful devotional moments.';
    else if (feedback.feeling === 'Devotional') msg = 'Thank you for sharing your devotional feeling. It helps us understand what connects with our community.';
    else if (feedback.feeling === 'Inspired') msg = 'It means a lot that this Reel inspired you. Your feedback guides what we create next.';
    else if (feedback.feeling === 'Calm') msg = 'We are happy this Reel brought you calm. Your thoughts help us shape future content.';
    else if (feedback.feeling === 'Deeply moved') msg = 'Thank you for sharing that you were deeply moved. Your response means more than you know.';

    successMessage.textContent = msg;
    questionCard.style.display = 'none';
    nav.style.display = 'none';
    progressArea.style.display = 'none';
    success.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ===== FACEBOOK SHARE ===== */
shareBtn.addEventListener('click', () => {
    const shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href);
    window.open(shareUrl, '_blank', 'width=650,height=550');
});

/* ===== INIT ===== */
showQuestion(1);
