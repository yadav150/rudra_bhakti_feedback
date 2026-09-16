/* ============================================================
   RUDRA BHAKTI — FEEDBACK VIEW
   Single feedback detail + 4K image share
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getDatabase, ref, get, set }
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
const auth = getAuth(app);
const db = getDatabase(app);

const ADMIN_UID = 'ukvRTL3B3WOoasKnJI7t6USMeUF3';
const TARGET_WIDTH = 3840; /* 4K */

const $ = (id) => document.getElementById(id);

const loginWrap = $('loginWrap');
const dash = $('dash');

const loginForm = $('loginForm');
const loginEmail = $('loginEmail');
const loginPassword = $('loginPassword');
const loginError = $('loginError');
const loginLabel = $('loginLabel');
const logoutBtn = $('logoutBtn');
const backBtn = $('backBtn');

const loadingState = $('loadingState');
const errorState = $('errorState');
const errorTitle = $('errorTitle');
const errorText = $('errorText');
const viewWrap = $('viewWrap');

const viewMeta = $('viewMeta');
const captureReel = $('captureReel');
const captureRating = $('captureRating');
const captureGrid = $('captureGrid');
const captureMessage = $('captureMessage');
const captureMessageText = $('captureMessageText');
const captureDate = $('captureDate');

const downloadBtn = $('downloadBtn');
const shareBtn = $('shareBtn');
const shareStatus = $('shareStatus');

const logoutModal = $('logoutModal');
const logoutBackdrop = $('logoutBackdrop');
const logoutCancel = $('logoutCancel');
const logoutConfirm = $('logoutConfirm');

let currentFeedback = null;
let savedReels = [];

/* ============================================================
   AUTH
   ============================================================ */
onAuthStateChanged(auth, (user) => {
    if (!user) { showLogin(); return; }
    if (user.uid !== ADMIN_UID) {
        signOut(auth);
        showLogin();
        loginError.textContent = 'This account is not authorized.';
        return;
    }
    showDash();
    loadPage();
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (!email || !password) {
        loginError.textContent = 'Please enter both email and password.';
        return;
    }
    loginLabel.textContent = 'Signing in…';
    const btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        let msg = 'Invalid email or password.';
        if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.';
        if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
        loginError.textContent = msg;
    } finally {
        loginLabel.textContent = 'Sign In';
        btn.disabled = false;
    }
});

function showLogin() {
    loginWrap.hidden = false;
    dash.hidden = true;
}
function showDash() {
    loginWrap.hidden = true;
    dash.hidden = false;
}

/* ============================================================
   LOGOUT
   ============================================================ */
function openLogoutModal() {
    logoutModal.hidden = false;
    document.body.style.overflow = 'hidden';
}
function closeLogoutModal() {
    logoutModal.hidden = true;
    document.body.style.overflow = '';
}
async function performLogout() {
    closeLogoutModal();
    try { await signOut(auth); } catch (err) { console.error(err); }
}
if (logoutBtn) logoutBtn.addEventListener('click', openLogoutModal);
if (logoutCancel) logoutCancel.addEventListener('click', closeLogoutModal);
if (logoutConfirm) logoutConfirm.addEventListener('click', performLogout);
if (logoutBackdrop) logoutBackdrop.addEventListener('click', closeLogoutModal);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && logoutModal && !logoutModal.hidden) closeLogoutModal();
});

if (backBtn) backBtn.addEventListener('click', () => {
    window.location.href = 'notifications.html';
});

/* ============================================================
   LOAD
   ============================================================ */
function getIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('id') || '').trim();
}

async function loadPage() {
    const id = getIdFromURL();
    if (!id) {
        showError('No feedback selected', 'Please open this page from a notification.');
        return;
    }

    /* Mark as read */
    try {
        await set(ref(db, 'adminNotifications/readIds/' + id), Date.now());
    } catch (err) { /* silent */ }

    try {
        const [feedbackSnap, reelsSnap] = await Promise.all([
            get(ref(db, 'feedback/' + id)),
            get(ref(db, 'reels'))
        ]);

        if (!feedbackSnap.exists()) {
            showError('Feedback not found', 'This response may have been removed.');
            return;
        }

        savedReels = [];
        reelsSnap.forEach((child) => {
            savedReels.push({ id: child.key, ...child.val() });
        });

        currentFeedback = { id, ...feedbackSnap.val() };
        renderView(currentFeedback);
    } catch (err) {
        console.error('Load error:', err);
        showError('Unable to load feedback', 'Please check your connection and try again.');
    }
}

function showError(title, text) {
    loadingState.hidden = true;
    viewWrap.hidden = true;
    errorState.hidden = false;
    errorTitle.textContent = title;
    errorText.textContent = text;
}

function showView() {
    loadingState.hidden = true;
    errorState.hidden = true;
    viewWrap.hidden = false;
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHTML(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getReelTitle(f) {
    if (f.reelTitle) return f.reelTitle;
    const reel = savedReels.find((r) => r.id === f.reelId);
    return reel && reel.title ? reel.title : '';
}

/* ============================================================
   RENDER
   ============================================================ */
function renderView(f) {
    const rating = Number(f.rating) || 0;
    const reelTitle = getReelTitle(f);
    const safe = escapeHTML;

    /* Toolbar meta */
    viewMeta.textContent = (f.reelId || 'Feedback') + ' · ' + formatDate(f.submittedAt);

    /* Reel block */
    captureReel.innerHTML = `
        ${f.reelId ? `<span class="reel-id">${safe(f.reelId)}</span>` : ''}
        ${reelTitle ? `<span class="reel-title">${safe(reelTitle)}</span>` : ''}
    `;

    /* Rating pill */
    captureRating.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1z"/>
        </svg>
        <span>${safe(rating)} / 5</span>
    `;

    /* Grid */
    const gridItems = [];
    if (f.feeling) gridItems.push(captureItem('Feeling', f.feeling));
    if (f.more) gridItems.push(captureItem('Would watch more', f.more));
    if (f.wantMore) gridItems.push(captureItem('Wants more of', f.wantMore));
    if (f.engageAgain) gridItems.push(captureItem('Engage again', f.engageAgain));
    gridItems.push(captureItem('From', f.name || 'Anonymous'));
    captureGrid.innerHTML = gridItems.join('');

    /* Message */
    const msg = (f.message || '').trim();
    if (msg) {
        captureMessage.hidden = false;
        captureMessageText.textContent = msg;
    } else {
        captureMessage.hidden = true;
    }

    /* Footer */
    captureDate.textContent = formatDate(f.submittedAt);

    showView();
}

function captureItem(label, value) {
    return `
        <div class="capture-item">
            <span class="capture-label">${escapeHTML(label)}</span>
            <span class="capture-value">${escapeHTML(value)}</span>
        </div>
    `;
}

/* ============================================================
   4K IMAGE GENERATION
   ============================================================ */
async function generate4KCanvas() {
    const target = $('captureArea');
    if (!target) throw new Error('Capture area not found');

    /* html2canvas renders at CSS width; we scale to reach 3840px */
    const cssWidth = target.offsetWidth;
    const scale = TARGET_WIDTH / cssWidth;

    const canvas = await html2canvas(target, {
        scale: scale,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        windowWidth: cssWidth,
        windowHeight: target.offsetHeight
    });
    return canvas;
}

function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
}

function showStatus(text, isError) {
    if (!shareStatus) return;
    shareStatus.textContent = text;
    shareStatus.hidden = false;
    shareStatus.classList.toggle('is-error', !!isError);
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => { shareStatus.hidden = true; }, 4000);
}

async function withButtonLock(btn, label, fn) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = label;
    try {
        await fn();
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

/* Download */
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        withButtonLock(downloadBtn, 'Preparing…', async () => {
            try {
                const canvas = await generate4KCanvas();
                const blob = await canvasToBlob(canvas);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'rudra-feedback-' + (currentFeedback?.id || 'review') + '.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                showStatus('4K image downloaded.');
            } catch (err) {
                console.error('Download failed:', err);
                showStatus('Could not generate image. Please try again.', true);
            }
        });
    });
}

/* Share */
if (shareBtn) {
    shareBtn.addEventListener('click', () => {
        withButtonLock(shareBtn, 'Preparing…', async () => {
            try {
                const canvas = await generate4KCanvas();
                const blob = await canvasToBlob(canvas);
                const file = new File(
                    [blob],
                    'rudra-feedback-' + (currentFeedback?.id || 'review') + '.png',
                    { type: 'image/png' }
                );

                /* Web Share API — mobile native share */
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Rudra Bhakti — Feedback',
                        text: 'Sharing a feedback review from Rudra Bhakti.'
                    });
                    showStatus('Shared successfully.');
                    return;
                }

                /* Fallback: download */
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                showStatus('Share not supported — image downloaded instead.');
            } catch (err) {
                if (err && err.name === 'AbortError') return;
                console.error('Share failed:', err);
                showStatus('Could not share image. Please try again.', true);
            }
        });
    });
}
