/* ============================================================
   RUDRA BHAKTI — PUBLIC FEEDBACK PAGE
   Identity screen + 6-question wizard
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

    const card = document.querySelector('.reel');
    if (card) {
        if (activeReel.url) {
            card.style.cursor = 'pointer';
            card.onclick = () => window.open(activeReel.url, '_blank', 'noopener');
        } else {
            card.style.cursor = '';
            card.onclick = null;
        }
    }
}

loadActiveReel();

/* ===== WIZARD STATE ===== */
let currentQuestion = 1;
const totalQuestions = 7;
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
const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmail');
const skipIdentityBtn = document.getElementById('skipIdentity');

/* ===== REQUIRED PER QUESTION =====
   1 = identity (optional)
   2 = feeling
   3 = more
   4 = rating
   5 = wantMore
   6 = engageAgain
   7 = message (optional)
*/
const REQUIRED = {
    2: 'feeling',
    3: 'more',
    4: 'rating',
    5: 'wantMore',
    6: 'engageAgain'
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

/* ===== SKIP IDENTITY ===== */
if (skipIdentityBtn) {
    skipIdentityBtn.addEventListener('click', () => {
        if (userNameInput) userNameInput.value = '';
        if (userEmailInput) userEmailInput.value = '';
        currentQuestion = 2;
        showQuestion(2);
    });
}

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

/* ===== IDENTITY HELPERS ===== */
function formatIST(date) {
    const formatted = date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
    return formatted + ' IST';
}

function generateAnonymousId() {
    return String(Math.floor(100000000 + Math.random() * 900000000));
}

function buildIdentity() {
    const rawName = (userNameInput?.value || '').trim();
    const rawEmail = (userEmailInput?.value || '').trim();
    const hasName = rawName.length > 0;
    const hasEmail = rawEmail.length > 0;
    const isAnonymous = !hasName && !hasEmail;

    let name;
    let email;

    if (hasName) {
        name = rawName.slice(0, 60);
    } else {
        name = 'Anonymous (' + formatIST(new Date()) + ')';
    }

    if (hasEmail) {
        email = rawEmail.slice(0, 120);
    } else {
        email = 'anonymous' + generateAnonymousId() + '@gmail.com';
    }

    return { name, email, isAnonymous };
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

    const identity = buildIdentity();

    const originalLabel = nextBtn.textContent;
    nextBtn.disabled = true;
    nextBtn.textContent = 'Submitting…';

    const feedback = {
        reelId: activeReel.id,
        reelTitle: activeReel.title || '',
        name: identity.name,
        email: identity.email,
        isAnonymous: identity.isAnonymous,
        feeling: answers.feeling || '',
        more: answers.more || '',
        rating: rating,
        wantMore: answers.wantMore || '',
        engageAgain: answers.engageAgain || '',
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
