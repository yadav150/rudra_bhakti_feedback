/* ============================================================
   RUDRA BHAKTI — ADMIN PANEL
   Phase 2 — Firebase Auth + Realtime Database
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getDatabase, ref, get, push, set, onValue, runTransaction, serverTimestamp }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAoPVLSklKARDfdDo6m2zkj1kabJVpsk",
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

/* ============================================================
   DOM
   ============================================================ */
const loginWrap = document.getElementById('loginWrap');
const forgotWrap = document.getElementById('forgotWrap');
const dash = document.getElementById('dash');

const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginLabel = document.getElementById('loginLabel');
const forgotLink = document.getElementById('forgotLink');

const forgotForm = document.getElementById('forgotForm');
const forgotEmail = document.getElementById('forgotEmail');
const forgotError = document.getElementById('forgotError');
const forgotSuccess = document.getElementById('forgotSuccess');
const forgotLabel = document.getElementById('forgotLabel');
const forgotBack = document.getElementById('forgotBack');

const logoutBtn = document.getElementById('logoutBtn');
const drawerUserEmail = document.getElementById('drawerUserEmail');

const statTotal = document.getElementById('statTotal');
const statAvg = document.getElementById('statAvg');
const statFive = document.getElementById('statFive');
const statToday = document.getElementById('statToday');

const searchInput = document.getElementById('searchInput');
const filterRating = document.getElementById('filterRating');
const filterDate = document.getElementById('filterDate');
const sortBy = document.getElementById('sortBy');
const resultCount = document.getElementById('resultCount');
const feedbackList = document.getElementById('feedbackList');
const ratingDist = document.getElementById('ratingDist');

const reelsEmpty = document.getElementById('reelsEmpty');
const reelsList = document.getElementById('reelsList');

const openAddReel = document.getElementById('openAddReel');
const drawerAddReel = document.getElementById('drawerAddReel');
const emptyAddReel = document.getElementById('emptyAddReel');
const addReelModal = document.getElementById('addReelModal');
const addReelBackdrop = document.getElementById('addReelBackdrop');
const closeAddReel = document.getElementById('closeAddReel');
const reelUrl = document.getElementById('reelUrl');
const reelUrlError = document.getElementById('reelUrlError');
const reelManual = document.getElementById('reelManual');
const reelTitleInput = document.getElementById('reelTitleInput');
const reelThumbInput = document.getElementById('reelThumbInput');
const fetchReel = document.getElementById('fetchReel');
const fetchLabel = document.getElementById('fetchLabel');
const reelPreview = document.getElementById('reelPreview');

const menuBtn = document.getElementById('menuBtn');
const drawer = document.getElementById('drawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const drawerClose = document.getElementById('drawerClose');
const drawerLogout = document.getElementById('drawerLogout');
const drawerLinks = document.querySelectorAll('.drawer-link[data-drawer]');
const navLinks = document.querySelectorAll('.dash-nav-link[data-nav]');

const logoutModal = document.getElementById('logoutModal');
const logoutBackdrop = document.getElementById('logoutBackdrop');
const logoutCancel = document.getElementById('logoutCancel');
const logoutConfirm = document.getElementById('logoutConfirm');

/* ============================================================
   STATE
   ============================================================ */
let allFeedback = [];
let savedReels = [];
let pendingReel = null;
let unsubscribeReels = null;
let unsubscribeFeedback = null;

/* ============================================================
   SCREEN CONTROL
   ============================================================ */
function showLogin() {
    loginWrap.hidden = false;
    forgotWrap.hidden = true;
    dash.hidden = true;
}
function showForgot() {
    loginWrap.hidden = true;
    forgotWrap.hidden = false;
    dash.hidden = true;
}
function showDash() {
    loginWrap.hidden = true;
    forgotWrap.hidden = true;
    dash.hidden = false;
}

/* ============================================================
   AUTH STATE — MAIN ENTRY POINT
   ============================================================ */
onAuthStateChanged(auth, (user) => {
    if (!user) {
        stopRealtimeListeners();
        showLogin();
        return;
    }
    if (user.uid !== ADMIN_UID) {
        signOut(auth);
        showLogin();
        loginError.textContent = 'This account is not authorized to access the admin panel.';
        return;
    }
    if (drawerUserEmail) drawerUserEmail.textContent = user.email || 'Administrator';
    showDash();
    startRealtimeListeners();
});

/* ============================================================
   LOGIN
   ============================================================ */
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
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        console.error('Login error:', err);
        let msg = 'Invalid email or password.';
        if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.';
        if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
        loginError.textContent = msg;
    } finally {
        loginLabel.textContent = 'Sign In';
        submitBtn.disabled = false;
    }
});

/* ============================================================
   FORGOT PASSWORD
   ============================================================ */
forgotLink.addEventListener('click', () => {
    forgotEmail.value = loginEmail.value.trim();
    forgotError.textContent = '';
    forgotSuccess.textContent = '';
    showForgot();
});

forgotBack.addEventListener('click', () => showLogin());

forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    forgotError.textContent = '';
    forgotSuccess.textContent = '';

    const email = forgotEmail.value.trim();
    if (!email) {
        forgotError.textContent = 'Please enter your email.';
        return;
    }

    forgotLabel.textContent = 'Sending…';
    const submitBtn = forgotForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
        await sendPasswordResetEmail(auth, email);
        forgotSuccess.textContent = 'If that email is registered, a reset link has been sent.';
        forgotForm.reset();
    } catch (err) {
        console.error('Reset error:', err);
        if (err.code === 'auth/too-many-requests') {
            forgotError.textContent = 'Too many attempts. Please try again later.';
        } else if (err.code === 'auth/invalid-email') {
            forgotError.textContent = 'Please enter a valid email address.';
        } else {
            forgotSuccess.textContent = 'If that email is registered, a reset link has been sent.';
            forgotForm.reset();
        }
    } finally {
        forgotLabel.textContent = 'Send Reset Link';
        submitBtn.disabled = false;
    }
});

/* ============================================================
   LOGOUT — with confirmation
   ============================================================ */
function openLogoutModal() {
    logoutModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => logoutCancel?.focus(), 80);
}
function closeLogoutModal() {
    logoutModal.hidden = true;
    document.body.style.overflow = '';
}
async function performLogout() {
    closeLogoutModal();
    try {
        await signOut(auth);
        loginEmail.value = '';
        loginPassword.value = '';
        closeDrawer();
    } catch (err) {
        console.error('Logout error:', err);
    }
}
if (logoutBtn) logoutBtn.addEventListener('click', openLogoutModal);
if (drawerLogout) drawerLogout.addEventListener('click', () => {
    closeDrawer();
    setTimeout(openLogoutModal, 220);
});
if (logoutCancel) logoutCancel.addEventListener('click', closeLogoutModal);
if (logoutConfirm) logoutConfirm.addEventListener('click', performLogout);
if (logoutBackdrop) logoutBackdrop.addEventListener('click', closeLogoutModal);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && logoutModal && !logoutModal.hidden) closeLogoutModal();
});

/* ============================================================
   MOBILE DRAWER
   ============================================================ */
function openDrawer() {
    drawer.classList.add('is-open');
    drawerBackdrop.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}
function closeDrawer() {
    drawer.classList.remove('is-open');
    drawerBackdrop.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}
if (menuBtn) menuBtn.addEventListener('click', () => {
    drawer.classList.contains('is-open') ? closeDrawer() : openDrawer();
});
if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
});

drawerLinks.forEach((link) => {
    link.addEventListener('click', () => {
        drawerLinks.forEach((l) => l.classList.remove('is-active'));
        link.classList.add('is-active');
        closeDrawer();
    });
});
navLinks.forEach((link) => {
    link.addEventListener('click', () => {
        navLinks.forEach((l) => l.classList.remove('is-active'));
        link.classList.add('is-active');
    });
});

window.addEventListener('scroll', () => {
    if (dash.hidden) return;
    let current = null;
    document.querySelectorAll('.dash-section').forEach((sec) => {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom > 120) current = sec.id;
    });
    if (current) {
        navLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + current));
        drawerLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + current));
    }
}, { passive: true });

/* ============================================================
   REALTIME LISTENERS
   ============================================================ */
function startRealtimeListeners() {
    stopRealtimeListeners();

    unsubscribeReels = onValue(ref(db, 'reels'), (snap) => {
        savedReels = [];
        snap.forEach((child) => {
            savedReels.push({ id: child.key, ...child.val() });
        });
        savedReels.sort((a, b) => String(a.id).localeCompare(String(b.id)));
        renderReels();
        renderStats();
    }, (err) => console.error('Reels listener error:', err));

    unsubscribeFeedback = onValue(ref(db, 'feedback'), (snap) => {
        allFeedback = [];
        snap.forEach((child) => {
            const v = child.val() || {};
            allFeedback.push({
                id: child.key,
                ...v,
                isAnonymous: !!v.isAnonymous || !v.name || v.name === 'Anonymous'
            });
        });
        renderStats();
        renderAnalytics();
        renderList();
    }, (err) => console.error('Feedback listener error:', err));
}

function stopRealtimeListeners() {
    if (unsubscribeReels) { unsubscribeReels(); unsubscribeReels = null; }
    if (unsubscribeFeedback) { unsubscribeFeedback(); unsubscribeFeedback = null; }
}

/* ============================================================
   STATS
   ============================================================ */
function calculateStats(list) {
    const total = list.length;
    if (!total) return { total: 0, avg: 0, five: 0, today: 0 };

    const rated = list.filter((f) => f.rating != null);
    const avg = rated.length
        ? rated.reduce((s, f) => s + (Number(f.rating) || 0), 0) / rated.length
        : 0;
    const five = list.filter((f) => Number(f.rating) === 5).length;

    const now = new Date();
    const isToday = (ts) => {
        if (!ts) return false;
        const d = new Date(ts);
        return d.getFullYear() === now.getFullYear()
            && d.getMonth() === now.getMonth()
            && d.getDate() === now.getDate();
    };

    return {
        total,
        avg: Math.round(avg * 10) / 10,
        five,
        today: list.filter((f) => isToday(f.submittedAt)).length
    };
}

function renderStats() {
    const s = calculateStats(allFeedback);
    if (statTotal) statTotal.textContent = s.total;
    if (statAvg) statAvg.textContent = s.avg.toFixed(1);
    if (statFive) statFive.textContent = s.five;
    if (statToday) statToday.textContent = s.today;
}

/* ============================================================
   RATING DISTRIBUTION
   ============================================================ */
function renderAnalytics() {
    if (!ratingDist) return;
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allFeedback.forEach((f) => {
        const r = Number(f.rating);
        if (r >= 1 && r <= 5) dist[r]++;
    });
    const total = Object.values(dist).reduce((a, b) => a + b, 0);

    if (!total) {
        ratingDist.innerHTML = `
            <div class="chart-empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-5"/>
                </svg>
                <p>No rating data yet</p>
            </div>`;
        return;
    }

    const max = Math.max(...Object.values(dist));
    ratingDist.innerHTML = `<div class="dist-list">${[5, 4, 3, 2, 1].map((n) => {
        const pct = max ? Math.round((dist[n] / max) * 100) : 0;
        return `
            <div class="dist-bar">
                <span class="dist-label">${n}</span>
                <div class="dist-track"><div class="dist-fill" style="width:${pct}%"></div></div>
                <span class="dist-count">${dist[n]}</span>
            </div>`;
    }).join('')}</div>`;
}

/* ============================================================
   REELS
   ============================================================ */
function renderReels() {
    if (!reelsEmpty || !reelsList) return;

    if (!savedReels.length) {
        reelsEmpty.hidden = false;
        reelsList.hidden = true;
        reelsList.innerHTML = '';
        return;
    }
    reelsEmpty.hidden = true;
    reelsList.hidden = false;

    reelsList.innerHTML = savedReels.map((r) => {
        const link = reelFeedbackUrl(r.id);
        const thumb = r.thumbnail
            ? '<img src="' + escapeAttr(r.thumbnail) + '" alt="" />'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v14l11-7z"/></svg>';
        return `
            <div class="reel-row">
                <div class="reel-row-thumb">${thumb}</div>
                <div class="reel-row-main">
                    <div class="reel-row-top">
                        <span class="reel-row-id">${escapeHTML(r.id)}</span>
                        <span class="reel-row-title">${escapeHTML(r.title || '')}</span>
                    </div>
                    <div class="reel-row-url">${escapeHTML(r.url || '')}</div>
                </div>
                <div class="reel-row-actions">
                    <a class="reel-row-link" href="${escapeAttr(link)}" target="_blank" rel="noopener">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                        </svg>
                        Open
                    </a>
                    <button type="button" class="reel-row-link reel-row-copy" data-copy="${escapeAttr(link)}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        Copy Link
                    </button>
                </div>
            </div>
        `;
    }).join('');

    reelsList.querySelectorAll('[data-copy]').forEach((btn) => {
        btn.addEventListener('click', () => copyReelLink(btn));
    });
}

function reelFeedbackUrl(id) {
    return 'index.html?reel=' + encodeURIComponent(id);
}

async function copyReelLink(btn) {
    const text = btn.dataset.copy || '';
    const absolute = new URL(text, window.location.href).href;
    try {
        await navigator.clipboard.writeText(absolute);
        btn.classList.add('is-copied');
        const original = btn.innerHTML;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Copied
        `;
        setTimeout(() => { btn.classList.remove('is-copied'); btn.innerHTML = original; }, 1800);
    } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = absolute;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        document.body.removeChild(ta);
    }
}

/* ============================================================
   FEEDBACK LIST
   ============================================================ */
function getFiltered() {
    let list = [...allFeedback];

    const q = (searchInput?.value || '').trim().toLowerCase();
    if (q) {
        list = list.filter((f) =>
            (f.name || '').toLowerCase().includes(q) ||
            (f.email || '').toLowerCase().includes(q) ||
            (f.message || '').toLowerCase().includes(q)
        );
    }

    const r = filterRating?.value || 'all';
    if (r === '4plus') list = list.filter((f) => Number(f.rating) >= 4);
    else if (r !== 'all') list = list.filter((f) => Number(f.rating) === Number(r));

    const d = filterDate?.value || 'all';
    if (d !== 'all') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = { today: 0, '7d': 7, '30d': 30 }[d];
        if (d === 'today') list = list.filter((f) => new Date(f.submittedAt) >= start);
        else if (diffDays) {
            const cutoff = new Date(now.getTime() - diffDays * 24 * 60 * 60 * 1000);
            list = list.filter((f) => new Date(f.submittedAt) >= cutoff);
        }
    }

    const s = sortBy?.value || 'newest';
    list.sort((a, b) => {
        if (s === 'newest') return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
        if (s === 'oldest') return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
        if (s === 'highest') return Number(b.rating) - Number(a.rating);
        if (s === 'lowest') return Number(a.rating) - Number(b.rating);
        return 0;
    });

    return list;
}

function renderList() {
    if (!feedbackList) return;
    const list = getFiltered();
    if (resultCount) resultCount.textContent = list.length + ' result' + (list.length === 1 ? '' : 's');

    if (!list.length) {
        feedbackList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                </div>
                <h3>No feedback yet</h3>
                <p>Feedback will appear here once users start responding to your reels.</p>
            </div>
        `;
        return;
    }

    feedbackList.innerHTML = list.map(renderRow).join('');
}

function renderRow(f) {
    const safe = (v) => escapeHTML(v == null ? '' : String(v));
    const dateStr = formatDate(f.submittedAt);

    return `
        <article class="row">
            <div class="row-top">
                <span class="row-name">${safe(f.name || 'Anonymous')}</span>
                ${!f.isAnonymous
                    ? `<span class="row-email">${safe(f.email)}</span>`
                    : `<span class="row-anon">Anonymous</span>`}
                <span class="row-rating">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1z"/>
                    </svg>
                    ${safe(f.rating)} / 5
                </span>
            </div>
            <div class="row-grid">
                ${item('Reel', f.reelId ? f.reelId + ' — ' + (f.reelTitle || '') : null)}
                ${item('Feeling', f.feeling)}
                ${item('Would watch more', f.wouldWatchMore)}
                ${item('Connected with', f.connectedWith)}
                ${f.message ? `
                    <div class="row-item row-message">
                        <span class="row-item-label">Message</span>
                        <span class="row-item-value">${safe(f.message)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="row-foot">
                <span>Submitted: ${safe(dateStr)}</span>
                <span>ID: ${safe(f.id)}</span>
            </div>
        </article>
    `;
}

function item(label, value) {
    if (!value) return '';
    return `
        <div class="row-item">
            <span class="row-item-label">${escapeHTML(label)}</span>
            <span class="row-item-value">${escapeHTML(value)}</span>
        </div>
    `;
}

/* ============================================================
   ADD REEL MODAL
   ============================================================ */
function openReelModal() {
    addReelModal.hidden = false;
    document.body.style.overflow = 'hidden';
    reelUrl.value = '';
    reelUrlError.textContent = '';
    reelManual.hidden = true;
    reelTitleInput.value = '';
    reelThumbInput.value = '';
    reelPreview.hidden = true;
    reelPreview.innerHTML = '';
    pendingReel = null;
    document.querySelector('.modal-card').classList.remove('is-processing');
    setTimeout(() => reelUrl.focus(), 80);
}
function closeReelModal() {
    addReelModal.hidden = true;
    document.body.style.overflow = '';
    pendingReel = null;
    reelPreview.hidden = true;
    reelPreview.innerHTML = '';
    reelManual.hidden = true;
    document.querySelector('.modal-card').classList.remove('is-processing');
}

async function handleFetchReel() {
    const url = reelUrl.value.trim();
    reelUrlError.textContent = '';

    if (!url) {
        reelUrlError.textContent = 'Please enter a Facebook Reel URL.';
        return;
    }
    if (!/^https?:\/\//i.test(url)) {
        reelUrlError.textContent = 'Please enter a valid URL starting with http:// or https://';
        return;
    }

    const card = document.querySelector('.modal-card');
    card.classList.add('is-processing');
    fetchReel.classList.add('is-loading');
    fetchReel.disabled = true;
    fetchLabel.textContent = 'Fetching…';
    reelPreview.hidden = true;
    reelManual.hidden = true;

    // Attempt real metadata fetch — will fail from browser due to CORS.
    let fetched = null;
    try {
        const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (res.ok) {
            const text = await res.text();
            const titleMatch = text.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
            const thumbMatch = text.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
            if (titleMatch) {
                fetched = {
                    title: decodeHtml(titleMatch[1]),
                    thumbnail: thumbMatch ? thumbMatch[1] : ''
                };
            }
        }
    } catch (err) {
        // CORS or network — expected
    }

    card.classList.remove('is-processing');
    fetchReel.classList.remove('is-loading');
    fetchReel.disabled = false;
    fetchLabel.textContent = 'Fetch Details';

    if (fetched) {
        reelTitleInput.value = fetched.title;
        reelThumbInput.value = fetched.thumbnail;
        reelManual.hidden = false;
        buildPreviewFromManual(url);
    } else {
        reelUrlError.textContent = 'Automatic metadata fetch is blocked by Facebook. Please fill in the details below.';
        reelManual.hidden = false;
        reelTitleInput.focus();
    }
}

function buildPreviewFromManual(url) {
    const title = reelTitleInput.value.trim();
    if (!title) {
        reelPreview.hidden = true;
        return;
    }
    const thumb = reelThumbInput.value.trim();
    pendingReel = {
        url,
        title,
        thumbnail: thumb
    };
    renderPreview(pendingReel);
}

function renderPreview(reel) {
    reelPreview.innerHTML = `
        <div class="reel-preview-card">
            <div class="reel-preview-thumb">
                ${reel.thumbnail
                    ? '<img src="' + escapeAttr(reel.thumbnail) + '" alt="" />'
                    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v14l11-7z"/></svg>'}
            </div>
            <div class="reel-preview-info">
                <span class="reel-preview-label">Ready to save</span>
                <h3 class="reel-preview-title">${escapeHTML(reel.title)}</h3>
            </div>
        </div>
        <div class="reel-preview-actions">
            <button type="button" class="btn btn-primary btn-block" id="saveReelBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Save Reel
            </button>
        </div>
    `;
    reelPreview.hidden = false;
    const saveBtn = document.getElementById('saveReelBtn');
    if (saveBtn) saveBtn.addEventListener('click', handleSaveReel);
}

async function handleSaveReel() {
    if (!pendingReel) return;
    const title = reelTitleInput.value.trim();
    if (!title) {
        reelUrlError.textContent = 'Please enter a title for this reel.';
        return;
    }

    const saveBtn = document.getElementById('saveReelBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = 'Saving…'; }

    try {
        const reelId = await generateNextReelId();
        const record = {
            title,
            url: pendingReel.url,
            thumbnail: reelThumbInput.value.trim() || '',
            createdAt: Date.now()
        };
        await set(ref(db, 'reels/' + reelId), record);
        closeReelModal();
    } catch (err) {
        console.error('Save reel error:', err);
        reelUrlError.textContent = 'Unable to save reel. Please try again.';
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = 'Save Reel'; }
    }
}

/* ============================================================
   SEQUENTIAL REEL ID VIA TRANSACTION
   ============================================================ */
async function generateNextReelId() {
    const counterRef = ref(db, 'counters/reelCounter');
    const result = await runTransaction(counterRef, (current) => {
        return (typeof current === 'number' ? current : 0) + 1;
    });
    if (!result.committed) throw new Error('Counter transaction failed');
    const next = result.snapshot.val();
    return 'RB' + String(next).padStart(3, '0');
}

/* ============================================================
   BINDINGS
   ============================================================ */
if (openAddReel) openAddReel.addEventListener('click', openReelModal);
if (drawerAddReel) drawerAddReel.addEventListener('click', () => {
    closeDrawer();
    setTimeout(openReelModal, 220);
});
if (emptyAddReel) emptyAddReel.addEventListener('click', openReelModal);
if (closeAddReel) closeAddReel.addEventListener('click', closeReelModal);
if (addReelBackdrop) addReelBackdrop.addEventListener('click', closeReelModal);
if (fetchReel) fetchReel.addEventListener('click', handleFetchReel);
if (reelUrl) {
    reelUrl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleFetchReel(); }
    });
}
if (reelTitleInput) {
    reelTitleInput.addEventListener('input', () => buildPreviewFromManual(reelUrl.value.trim()));
}
if (reelThumbInput) {
    reelThumbInput.addEventListener('input', () => buildPreviewFromManual(reelUrl.value.trim()));
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && addReelModal && !addReelModal.hidden) closeReelModal();
});

[searchInput, filterRating, filterDate, sortBy].forEach((el) => {
    if (!el) return;
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', renderList);
});

/* ============================================================
   HELPERS
   ============================================================ */
function formatDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}
function escapeHTML(v) {
    return String(v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(v) {
    return String(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function decodeHtml(str) {
    const el = document.createElement('textarea');
    el.innerHTML = str;
    return el.value;
}
