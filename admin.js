/* ============================================================
   RUDRA BHAKTI — ADMIN PANEL
   Phase 3 — Intelligence Engine
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getDatabase, ref, get, push, set, onValue, runTransaction }
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

/* ============================================================
   DOM
   ============================================================ */
const $ = (id) => document.getElementById(id);

const loginWrap = $('loginWrap');
const forgotWrap = $('forgotWrap');
const dash = $('dash');

const loginForm = $('loginForm');
const loginEmail = $('loginEmail');
const loginPassword = $('loginPassword');
const loginError = $('loginError');
const loginLabel = $('loginLabel');
const forgotLink = $('forgotLink');
const forgotForm = $('forgotForm');
const forgotEmail = $('forgotEmail');
const forgotError = $('forgotError');
const forgotSuccess = $('forgotSuccess');
const forgotLabel = $('forgotLabel');
const forgotBack = $('forgotBack');
const logoutBtn = $('logoutBtn');
const drawerUserEmail = $('drawerUserEmail');

const statTotal = $('statTotal');
const statAvg = $('statAvg');
const statFive = $('statFive');
const statToday = $('statToday');

const searchInput = $('searchInput');
const filterRating = $('filterRating');
const filterDate = $('filterDate');
const sortBy = $('sortBy');
const resultCount = $('resultCount');
const feedbackList = $('feedbackList');
const ratingDist = $('ratingDist');

const reelsEmpty = $('reelsEmpty');
const reelsList = $('reelsList');
const reelIntelEmpty = $('reelIntelEmpty');
const reelIntelList = $('reelIntelList');
const compareSelect = $('compareSelect');
const compareResult = $('compareResult');

const openAddReel = $('openAddReel');
const drawerAddReel = $('drawerAddReel');
const emptyAddReel = $('emptyAddReel');
const addReelModal = $('addReelModal');
const addReelBackdrop = $('addReelBackdrop');
const closeAddReel = $('closeAddReel');
const reelUrl = $('reelUrl');
const reelUrlError = $('reelUrlError');
const reelManual = $('reelManual');
const reelTitleInput = $('reelTitleInput');
const reelThumbInput = $('reelThumbInput');
const fetchReel = $('fetchReel');
const fetchLabel = $('fetchLabel');
const reelPreview = $('reelPreview');

const menuBtn = $('menuBtn');
const drawer = $('drawer');
const drawerBackdrop = $('drawerBackdrop');
const drawerClose = $('drawerClose');
const drawerLogout = $('drawerLogout');
const drawerLinks = document.querySelectorAll('.drawer-link[data-drawer]');
const navLinks = document.querySelectorAll('.dash-nav-link[data-nav]');

const logoutModal = $('logoutModal');
const logoutBackdrop = $('logoutBackdrop');
const logoutCancel = $('logoutCancel');
const logoutConfirm = $('logoutConfirm');

const execSatisfaction = $('execSatisfaction');
const execSatisfactionSub = $('execSatisfactionSub');
const execRecommend = $('execRecommend');
const execRecommendSub = $('execRecommendSub');
const execRepeat = $('execRepeat');
const execRepeatSub = $('execRepeatSub');
const execEmotion = $('execEmotion');
const execEmotionSub = $('execEmotionSub');
const execMomentum = $('execMomentum');
const execMomentumSub = $('execMomentumSub');
const execConfidence = $('execConfidence');
const execConfidenceSub = $('execConfidenceSub');
const execSummary = $('execSummary');
const actionList = $('actionList');

const metricRecommend = $('metricRecommend');
const metricFuture = $('metricFuture');
const metricRepeat = $('metricRepeat');

const funnelWrap = $('funnelWrap');
const feelingTop = $('feelingTop');
const feelingDist = $('feelingDist');
const perceptPositive = $('perceptPositive');
const perceptNeutral = $('perceptNeutral');
const perceptNegative = $('perceptNegative');
const segmentGrid = $('segmentGrid');
const trendWrap = $('trendWrap');

const sysLength = $('sysLength');
const sysWritten = $('sysWritten');
const sysCompletion = $('sysCompletion');

const dnaGrid = $('dnaGrid');
const patternGrid = $('patternGrid');
const contradictList = $('contradictList');
const fatigueList = $('fatigueList');
const momentumGrid = $('momentumGrid');
const opportunityGrid = $('opportunityGrid');
const riskList = $('riskList');
const voiceGrid = $('voiceGrid');
const portfolioGrid = $('portfolioGrid');
const lifecycleGrid = $('lifecycleGrid');
const askGrid = $('askGrid');
const askResponse = $('askResponse');

/* ============================================================
   STATE
   ============================================================ */
let allFeedback = [];
let savedReels = [];
let pendingReel = null;
let unsubscribeReels = null;
let unsubscribeFeedback = null;
let selectedCompare = new Set();

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
   AUTH
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
        console.error('Login error:', err);
        let msg = 'Invalid email or password.';
        if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.';
        if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
        loginError.textContent = msg;
    } finally {
        loginLabel.textContent = 'Sign In';
        btn.disabled = false;
    }
});

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
    const btn = forgotForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        await sendPasswordResetEmail(auth, email);
        forgotSuccess.textContent = 'If that email is registered, a reset link has been sent.';
        forgotForm.reset();
    } catch (err) {
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
        btn.disabled = false;
    }
});

/* ============================================================
   LOGOUT
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
   DRAWER
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
        renderAllIntelligence();
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
        renderEverything();
    }, (err) => console.error('Feedback listener error:', err));
}

function stopRealtimeListeners() {
    if (unsubscribeReels) { unsubscribeReels(); unsubscribeReels = null; }
    if (unsubscribeFeedback) { unsubscribeFeedback(); unsubscribeFeedback = null; }
}

/* ============================================================
   RENDER ALL
   ============================================================ */
function renderEverything() {
    renderStats();
    renderAnalytics();
    renderList();
    renderAllIntelligence();
}

function renderAllIntelligence() {
    renderExecutive();
    renderReelIntelligence();
    renderReelComparison();
    renderFunnel();
    renderFeeling();
    renderPerception();
    renderSegments();
    renderTrends();
    renderTechnical();
    renderDNA();
    renderPatterns();
    renderContradictions();
    renderFatigue();
    renderMomentum();
    renderOpportunities();
    renderRisks();
    renderVoice();
    renderPortfolio();
    renderLifecycle();
    renderAskGrid();
    renderActionCenter();
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHTML(v) {
    return String(v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(v) {
    return String(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
function pct(n, d) {
    if (!d) return 0;
    return Math.round((n / d) * 100);
}
function emptyState(icon, title, desc) {
    return `
        <div class="chart-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                ${icon}
            </svg>
            <p>${escapeHTML(title)}</p>
            ${desc ? `<span>${escapeHTML(desc)}</span>` : ''}
        </div>
    `;
}

/* ============================================================
   STATS
   ============================================================ */
function calculateStats(list) {
    const total = list.length;
    if (!total) return { total: 0, avg: 0, five: 0, today: 0 };
    const rated = list.filter((f) => f.rating != null);
    const avg = rated.length ? rated.reduce((s, f) => s + (Number(f.rating) || 0), 0) / rated.length : 0;
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
        ratingDist.innerHTML = emptyState('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-5"/>', 'No rating data yet');
        return;
    }
    const max = Math.max(...Object.values(dist));
    ratingDist.innerHTML = `<div class="dist-list">${[5, 4, 3, 2, 1].map((n) => {
        const p = max ? Math.round((dist[n] / max) * 100) : 0;
        return `
            <div class="dist-bar">
                <span class="dist-label">${n}</span>
                <div class="dist-track"><div class="dist-fill" style="width:${p}%"></div></div>
                <span class="dist-count">${dist[n]}</span>
            </div>`;
    }).join('')}</div>`;

    const rated = allFeedback.filter((f) => f.rating != null);
    const recYes = rated.filter((f) => {
        const v = (f.wouldRecommend || f.recommend || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('probably yes') || v === 'yes';
    }).length;
    if (metricRecommend) metricRecommend.textContent = pct(recYes, rated.length) + '%';

    const futYes = rated.filter((f) => {
        const v = (f.wouldWatchMore || f.more || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;
    if (metricFuture) metricFuture.textContent = pct(futYes, rated.length) + '%';

    const repYes = rated.filter((f) => {
        const v = (f.engageAgain || '').toLowerCase();
        return v.startsWith('very likely') || v.startsWith('likely');
    }).length;
    if (metricRepeat) metricRepeat.textContent = pct(repYes, rated.length) + '%';
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
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied`;
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
                ${item('Stood out', f.stoodOut)}
                ${item('Held interest', f.heldInterest)}
                ${item('Presentation', f.presentation)}
                ${item('Improve', f.improve)}
                ${item('Wants more of', f.wantMore)}
                ${item('Engage again', f.engageAgain)}
                ${item('Liked part', f.likedPart)}
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
   EXECUTIVE INTELLIGENCE
   ============================================================ */
function renderExecutive() {
    const total = allFeedback.length;

    if (!total) {
        if (execSatisfaction) execSatisfaction.textContent = '—';
        if (execSatisfactionSub) execSatisfactionSub.textContent = 'Not enough data';
        if (execRecommend) execRecommend.textContent = '—';
        if (execRecommendSub) execRecommendSub.textContent = 'Not enough data';
        if (execRepeat) execRepeat.textContent = '—';
        if (execRepeatSub) execRepeatSub.textContent = 'Not enough data';
        if (execEmotion) execEmotion.textContent = '—';
        if (execEmotionSub) execEmotionSub.textContent = 'Not enough data';
        if (execMomentum) execMomentum.textContent = '—';
        if (execMomentumSub) execMomentumSub.textContent = 'Not enough data';
        if (execConfidence) execConfidence.textContent = '0';
        if (execConfidenceSub) execConfidenceSub.textContent = 'No data';
        if (execSummary) execSummary.textContent = 'Not enough data to generate a reliable executive summary.';
        return;
    }

    const rated = allFeedback.filter((f) => f.rating != null);
    const avg = rated.length ? rated.reduce((s, f) => s + (Number(f.rating) || 0), 0) / rated.length : 0;
    const satisfaction = rated.length ? Math.round((avg / 5) * 100) : 0;

    const recYes = allFeedback.filter((f) => {
        const v = (f.wouldWatchMore || f.more || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;
    const recommend = pct(recYes, total);

    const repYes = allFeedback.filter((f) => {
        const v = (f.engageAgain || '').toLowerCase();
        return v.startsWith('very likely') || v.startsWith('likely');
    }).length;
    const repeat = pct(repYes, total);

    const feelings = {};
    allFeedback.forEach((f) => {
        const k = (f.feeling || '').trim();
        if (k) feelings[k] = (feelings[k] || 0) + 1;
    });
    const topFeeling = Object.entries(feelings).sort((a, b) => b[1] - a[1])[0];
    const emotionPct = topFeeling ? pct(topFeeling[1], total) : 0;

    const now = Date.now();
    const last7 = allFeedback.filter((f) => now - (new Date(f.submittedAt).getTime() || 0) <= 7 * 864e5);
    const prev7 = allFeedback.filter((f) => {
        const t = new Date(f.submittedAt).getTime() || 0;
        return now - t > 7 * 864e5 && now - t <= 14 * 864e5;
    });
    const recentAvg = last7.length ? last7.reduce((s, f) => s + Number(f.rating || 0), 0) / last7.length : 0;
    const prevAvg = prev7.length ? prev7.reduce((s, f) => s + Number(f.rating || 0), 0) / prev7.length : 0;
    const momentumDelta = prevAvg ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0;
    const momentumText = !prev7.length ? 'Baseline'
        : momentumDelta > 5 ? 'Improving'
        : momentumDelta < -5 ? 'Declining'
        : 'Stable';

    const confidence = total < 5 ? 'Low' : total < 20 ? 'Medium' : 'High';

    if (execSatisfaction) execSatisfaction.textContent = satisfaction + '%';
    if (execSatisfactionSub) execSatisfactionSub.textContent = 'Avg rating ' + avg.toFixed(1) + ' / 5';
    if (execRecommend) execRecommend.textContent = recommend + '%';
    if (execRecommendSub) execRecommendSub.textContent = recYes + ' of ' + total + ' want more';
    if (execRepeat) execRepeat.textContent = repeat + '%';
    if (execRepeatSub) execRepeatSub.textContent = repYes + ' likely to engage';
    if (execEmotion) execEmotion.textContent = topFeeling ? topFeeling[0] : '—';
    if (execEmotionSub) execEmotionSub.textContent = topFeeling ? emotionPct + '% of responses' : 'Not enough data';
    if (execMomentum) execMomentum.textContent = momentumText;
    if (execMomentumSub) execMomentumSub.textContent = prev7.length
        ? (momentumDelta >= 0 ? '+' : '') + momentumDelta.toFixed(1) + '% vs prior week'
        : 'Need 2 weeks of data';
    if (execConfidence) execConfidence.textContent = confidence;
    if (execConfidenceSub) execConfidenceSub.textContent = total + ' responses collected';

    const parts = [];
    parts.push('Audience satisfaction stands at ' + satisfaction + '% (avg ' + avg.toFixed(1) + '/5).');
    if (topFeeling) parts.push('The most common emotional response is ' + topFeeling[0].toLowerCase() + '.');
    parts.push(recommend + '% of respondents indicated interest in seeing more content like this.');
    if (prev7.length) {
        parts.push(momentumText === 'Improving' ? 'Recent ratings are trending upward.'
            : momentumText === 'Declining' ? 'Recent ratings are trending downward.'
            : 'Recent ratings are stable.');
    }
    if (total < 20) parts.push('Sample size is small — insights should be treated as directional.');
    if (execSummary) execSummary.textContent = parts.join(' ');
}

/* ============================================================
   REEL INTELLIGENCE
   ============================================================ */
function computeReelStats(reelId) {
    const items = allFeedback.filter((f) => f.reelId === reelId);
    const total = items.length;
    if (!total) return null;

    const rated = items.filter((f) => f.rating != null);
    const avg = rated.length ? rated.reduce((s, f) => s + Number(f.rating || 0), 0) / rated.length : 0;

    const recYes = items.filter((f) => {
        const v = (f.wouldWatchMore || f.more || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;
    const recommend = pct(recYes, total);

    const repYes = items.filter((f) => {
        const v = (f.engageAgain || '').toLowerCase();
        return v.startsWith('very likely') || v.startsWith('likely');
    }).length;
    const repeat = pct(repYes, total);

    const feelings = {};
    items.forEach((f) => {
        const k = (f.feeling || '').trim();
        if (k) feelings[k] = (feelings[k] || 0) + 1;
    });
    const topFeeling = Object.entries(feelings).sort((a, b) => b[1] - a[1])[0];

    const stoodOut = {};
    items.forEach((f) => {
        const k = (f.stoodOut || '').trim();
        if (k) stoodOut[k] = (stoodOut[k] || 0) + 1;
    });
    const topStoodOut = Object.entries(stoodOut).sort((a, b) => b[1] - a[1])[0];

    const likedPart = {};
    items.forEach((f) => {
        const k = (f.likedPart || '').trim();
        if (k) likedPart[k] = (likedPart[k] || 0) + 1;
    });
    const topLikedPart = Object.entries(likedPart).sort((a, b) => b[1] - a[1])[0];

    const improve = {};
    items.forEach((f) => {
        const k = (f.improve || '').trim();
        if (k) improve[k] = (improve[k] || 0) + 1;
    });
    const topImprove = Object.entries(improve).sort((a, b) => b[1] - a[1])[0];

    const written = items.filter((f) => (f.message || '').trim()).length;
    const writtenPct = pct(written, total);

    return {
        total, avg, recommend, repeat,
        topFeeling, topStoodOut, topLikedPart, topImprove,
        writtenPct
    };
}

function labelForReel(stats) {
    if (!stats) return { text: 'Insufficient Data', cls: 'insufficient' };
    if (stats.total < 3) return { text: 'Insufficient Data', cls: 'insufficient' };
    if (stats.avg >= 4.5 && stats.recommend >= 70) return { text: 'High Performer', cls: 'high' };
    if (stats.avg >= 4 && stats.recommend >= 50) return { text: 'Strong Potential', cls: 'strong' };
    if (stats.avg >= 3.5) return { text: 'Stable', cls: 'stable' };
    return { text: 'Needs Attention', cls: 'attention' };
}

function renderReelIntelligence() {
    if (!reelIntelEmpty || !reelIntelList) return;
    if (!savedReels.length || !allFeedback.length) {
        reelIntelEmpty.hidden = false;
        reelIntelList.hidden = true;
        reelIntelList.innerHTML = '';
        return;
    }
    reelIntelEmpty.hidden = true;
    reelIntelList.hidden = false;

    const rows = savedReels.map((r) => {
        const stats = computeReelStats(r.id);
        const label = labelForReel(stats);
        if (!stats) {
            return `
                <div class="intel-row">
                    <div class="intel-head">
                        <span class="intel-id">${escapeHTML(r.id)}</span>
                        <span class="intel-title">${escapeHTML(r.title || '')}</span>
                        <span class="intel-label intel-label--${label.cls}">${label.text}</span>
                    </div>
                    <div class="intel-insights">No feedback collected for this reel yet.</div>
                </div>
            `;
        }
        return `
            <div class="intel-row">
                <div class="intel-head">
                    <span class="intel-id">${escapeHTML(r.id)}</span>
                    <span class="intel-title">${escapeHTML(r.title || '')}</span>
                    <span class="intel-label intel-label--${label.cls}">${label.text}</span>
                </div>
                <div class="intel-metrics">
                    <div class="intel-metric">
                        <div class="intel-metric-label">Responses</div>
                        <div class="intel-metric-value">${stats.total}</div>
                    </div>
                    <div class="intel-metric">
                        <div class="intel-metric-label">Rating</div>
                        <div class="intel-metric-value">${stats.avg.toFixed(1)} / 5</div>
                    </div>
                    <div class="intel-metric">
                        <div class="intel-metric-label">Recommend</div>
                        <div class="intel-metric-value">${stats.recommend}%</div>
                    </div>
                    <div class="intel-metric">
                        <div class="intel-metric-label">Repeat</div>
                        <div class="intel-metric-value">${stats.repeat}%</div>
                    </div>
                </div>
                <div class="intel-insights">
                    ${stats.topFeeling ? `<span><strong>Dominant feeling:</strong> ${escapeHTML(stats.topFeeling[0])} (${pct(stats.topFeeling[1], stats.total)}%)</span>` : ''}
                    ${stats.topStoodOut ? `<span><strong>Stood out:</strong> ${escapeHTML(stats.topStoodOut[0])}</span>` : ''}
                    ${stats.topLikedPart ? `<span><strong>Liked part:</strong> ${escapeHTML(stats.topLikedPart[0])}</span>` : ''}
                    ${stats.topImprove && stats.topImprove[0] !== 'Nothing' ? `<span><strong>Improve:</strong> ${escapeHTML(stats.topImprove[0])}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    reelIntelList.innerHTML = rows;
}

/* ============================================================
   REEL COMPARISON
   ============================================================ */
function renderReelComparison() {
    if (!compareSelect || !compareResult) return;

    if (!savedReels.length) {
        compareSelect.innerHTML = '';
        compareResult.innerHTML = emptyState(
            '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>',
            'Add reels to compare'
        );
        return;
    }

    compareSelect.innerHTML = savedReels.map((r) => `
        <button type="button" class="compare-chip${selectedCompare.has(r.id) ? ' is-active' : ''}" data-id="${escapeAttr(r.id)}">
            ${escapeHTML(r.id)}
        </button>
    `).join('');

    compareSelect.querySelectorAll('.compare-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const id = chip.dataset.id;
            if (selectedCompare.has(id)) selectedCompare.delete(id);
            else selectedCompare.add(id);
            renderReelComparison();
        });
    });

    if (selectedCompare.size < 2) {
        compareResult.innerHTML = emptyState(
            '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>',
            'Select at least 2 reels to compare'
        );
        return;
    }

    const ids = Array.from(selectedCompare);
    const rows = ids.map((id) => {
        const stats = computeReelStats(id);
        const reel = savedReels.find((r) => r.id === id);
        return { id, title: reel?.title || '', stats };
    });

    const metrics = [
        { label: 'Responses', get: (s) => s ? s.total : 0 },
        { label: 'Avg Rating', get: (s) => s ? s.avg.toFixed(1) : '—' },
        { label: 'Recommend', get: (s) => s ? s.recommend + '%' : '—' },
        { label: 'Repeat Intent', get: (s) => s ? s.repeat + '%' : '—' },
        { label: 'Dominant Feeling', get: (s) => s && s.topFeeling ? s.topFeeling[0] : '—' },
        { label: 'Stood Out', get: (s) => s && s.topStoodOut ? s.topStoodOut[0] : '—' },
        { label: 'Liked Part', get: (s) => s && s.topLikedPart ? s.topLikedPart[0] : '—' },
        { label: 'Improve', get: (s) => s && s.topImprove ? s.topImprove[0] : '—' }
    ];

    let table = '<table class="compare-table"><thead><tr><th>Metric</th>';
    rows.forEach((r) => { table += `<th>${escapeHTML(r.id)}</th>`; });
    table += '</tr></thead><tbody>';
    metrics.forEach((m) => {
        table += `<tr><td>${escapeHTML(m.label)}</td>`;
        rows.forEach((r) => { table += `<td>${escapeHTML(String(m.get(r.stats)))}</td>`; });
        table += '</tr>';
    });
    table += '</tbody></table>';

    let summary = 'Comparison summary: ';
    const rated = rows.filter((r) => r.stats && r.stats.total);
    if (rated.length < 2) {
        summary += 'insufficient data for a reliable comparison.';
    } else {
        const best = rated.slice().sort((a, b) => b.stats.avg - a.stats.avg)[0];
        summary += best.id + ' shows the highest average rating (' + best.stats.avg.toFixed(1) + '/5).';
        const totalResponses = rated.reduce((s, r) => s + r.stats.total, 0);
        if (totalResponses < 10) summary += ' Sample size is small — treat as directional.';
    }

    compareResult.innerHTML = table + `<div class="compare-summary">${escapeHTML(summary)}</div>`;
}

/* ============================================================
   FUNNEL
   ============================================================ */
function renderFunnel() {
    if (!funnelWrap) return;
    const total = allFeedback.length;
    if (!total) {
        funnelWrap.innerHTML = emptyState(
            '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
            'No funnel data yet'
        );
        return;
    }

    const rated = allFeedback.filter((f) => f.rating != null).length;
    const satisfied = allFeedback.filter((f) => Number(f.rating) >= 4).length;
    const recommend = allFeedback.filter((f) => {
        const v = (f.wouldWatchMore || f.more || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;
    const repeat = allFeedback.filter((f) => {
        const v = (f.engageAgain || '').toLowerCase();
        return v.startsWith('very likely') || v.startsWith('likely');
    }).length;
    const written = allFeedback.filter((f) => (f.message || '').trim()).length;

    const stages = [
        { label: 'Started', value: total },
        { label: 'Rated', value: rated },
        { label: 'Satisfied', value: satisfied },
        { label: 'Recommend', value: recommend },
        { label: 'Repeat', value: repeat },
        { label: 'Written', value: written }
    ];

    funnelWrap.innerHTML = stages.map((s) => `
        <div class="funnel-row">
            <span class="funnel-label">${escapeHTML(s.label)}</span>
            <div class="funnel-track"><div class="funnel-fill" style="width:${pct(s.value, total)}%"></div></div>
            <span class="funnel-value">${pct(s.value, total)}%</span>
        </div>
    `).join('');
}

/* ============================================================
   FEELING
   ============================================================ */
function renderFeeling() {
    if (!feelingTop || !feelingDist) return;
    const feelings = {};
    allFeedback.forEach((f) => {
        const k = (f.feeling || '').trim();
        if (k) feelings[k] = (feelings[k] || 0) + 1;
    });
    const total = Object.values(feelings).reduce((a, b) => a + b, 0);
    if (!total) {
        feelingTop.innerHTML = emptyState(
            '<circle cx="12" cy="12" r="10"/><path d="M8 15s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
            'Not enough data yet'
        );
        feelingDist.innerHTML = emptyState(
            '<circle cx="12" cy="12" r="10"/><path d="M12 2v10l7 3"/>',
            'No feeling data yet'
        );
        return;
    }
    const sorted = Object.entries(feelings).sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    feelingTop.innerHTML = `
        <div class="metric-empty">
            <span class="metric-value">${escapeHTML(top[0])}</span>
            <span class="metric-label">${pct(top[1], total)}% of responses</span>
        </div>
    `;
    feelingDist.innerHTML = `<div class="dist-list">${sorted.map(([k, v]) => {
        const p = pct(v, total);
        return `
            <div class="dist-bar">
                <span class="dist-label" style="font-size:11px;text-align:left;grid-column:1/2;">${escapeHTML(k.slice(0,2))}</span>
                <div class="dist-track"><div class="dist-fill" style="width:${p}%"></div></div>
                <span class="dist-count">${v}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);text-align:left;margin-left:-32px;grid-column:1/-1;padding-left:34px;">${escapeHTML(k)}</div>
        `;
    }).join('')}</div>`;
}

/* ============================================================
   PERCEPTION
   ============================================================ */
function renderPerception() {
    if (!perceptPositive) return;
    const total = allFeedback.length;
    if (!total) {
        perceptPositive.textContent = '0%';
        perceptNeutral.textContent = '0%';
        perceptNegative.textContent = '0%';
        return;
    }
    let pos = 0, neu = 0, neg = 0;
    allFeedback.forEach((f) => {
        const r = Number(f.rating) || 0;
        const rec = (f.wouldWatchMore || f.more || '').toLowerCase();
        if (r >= 4 || rec.startsWith('definitely') || rec.startsWith('yes')) pos++;
        else if (r === 3 || rec.startsWith("i'm not") || rec.startsWith('not sure')) neu++;
        else if (r > 0) neg++;
    });
    const tot = pos + neu + neg;
    if (!tot) {
        perceptPositive.textContent = '0%';
        perceptNeutral.textContent = '0%';
        perceptNegative.textContent = '0%';
        return;
    }
    perceptPositive.textContent = pct(pos, tot) + '%';
    perceptNeutral.textContent = pct(neu, tot) + '%';
    perceptNegative.textContent = pct(neg, tot) + '%';
}

/* ============================================================
   SEGMENTS
   ============================================================ */
function renderSegments() {
    if (!segmentGrid) return;
    const total = allFeedback.length;
    if (!total) {
        segmentGrid.innerHTML = emptyState(
            '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
            'No segment data yet'
        );
        return;
    }

    const strong = allFeedback.filter((f) => Number(f.rating) === 5 && (f.engageAgain || '').toLowerCase().startsWith('very likely')).length;
    const highIntent = allFeedback.filter((f) => (f.engageAgain || '').toLowerCase().startsWith('likely') || (f.engageAgain || '').toLowerCase().startsWith('very likely')).length;
    const contentFans = allFeedback.filter((f) => (f.stoodOut || '').trim() && (f.stoodOut || '').toLowerCase() !== 'nothing specific').length;
    const emotional = allFeedback.filter((f) => ['Peaceful', 'Devotional', 'Emotional', 'Deeply moved'].includes((f.feeling || '').trim())).length;
    const neutral = allFeedback.filter((f) => Number(f.rating) === 3).length;
    const improving = allFeedback.filter((f) => (f.improve || '').trim() && (f.improve || '').toLowerCase() !== 'nothing').length;

    const segments = [
        { name: 'Strong Advocates', count: strong, desc: 'Rated 5 and Very Likely to engage again.' },
        { name: 'High Intent', count: highIntent, desc: 'Likely or Very Likely to engage again.' },
        { name: 'Content-Specific Fans', count: contentFans, desc: 'Chose a specific element that stood out.' },
        { name: 'Emotionally Engaged', count: emotional, desc: 'Selected a strong emotional feeling.' },
        { name: 'Neutral Responders', count: neutral, desc: 'Rated the reel 3 out of 5.' },
        { name: 'Improvement-Sensitive', count: improving, desc: 'Suggested an improvement area.' }
    ];

    segmentGrid.innerHTML = segments.map((s) => `
        <div class="segment-card">
            <div class="segment-head">
                <span class="segment-name">${escapeHTML(s.name)}</span>
                <span class="segment-count">${pct(s.count, total)}%</span>
            </div>
            <div class="segment-bar"><div class="segment-bar-fill" style="width:${pct(s.count, total)}%"></div></div>
            <div class="segment-desc">${escapeHTML(s.desc)}</div>
        </div>
    `).join('');
}

/* ============================================================
   TRENDS
   ============================================================ */
function renderTrends() {
    if (!trendWrap) return;
    const total = allFeedback.length;
    if (total < 3) {
        trendWrap.innerHTML = emptyState(
            '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>',
            'Insufficient data for trend analysis',
            'Feedback over time will appear here'
        );
        return;
    }
    const days = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days[key] = 0;
    }
    allFeedback.forEach((f) => {
        const t = f.submittedAt;
        if (!t) return;
        const d = new Date(t).toISOString().slice(0, 10);
        if (d in days) days[d]++;
    });
    const values = Object.entries(days);
    const max = Math.max(...values.map(([, v]) => v), 1);
    trendWrap.classList.remove('chart-empty','chart-empty--tall');
    trendWrap.innerHTML = `<div class="dist-list">${values.map(([k, v]) => `
        <div class="dist-bar">
            <span class="dist-label" style="font-size:10px;text-align:left;grid-column:1/2;">${k.slice(5)}</span>
            <div class="dist-track"><div class="dist-fill" style="width:${Math.round((v/max)*100)}%"></div></div>
            <span class="dist-count">${v}</span>
        </div>
    `).join('')}</div>`;
}

/* ============================================================
   TECHNICAL
   ============================================================ */
function renderTechnical() {
    const total = allFeedback.length;
    const written = allFeedback.filter((f) => (f.message || '').trim()).length;
    const avgLen = written ? Math.round(allFeedback.reduce((s, f) => s + (f.message || '').length, 0) / total) : 0;
    const completion = total ? 100 : 0;
    if (sysLength) sysLength.textContent = avgLen;
    if (sysWritten) sysWritten.textContent = pct(written, total) + '%';
    if (sysCompletion) sysCompletion.textContent = completion + '%';
}

/* ============================================================
   CONTENT DNA
   ============================================================ */
function renderDNA() {
    if (!dnaGrid) return;
    if (!allFeedback.length) {
        dnaGrid.innerHTML = emptyState(
            '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0012 2z"/>',
            'Not enough data to extract DNA'
        );
        return;
    }
    const feelings = {}, stoodOut = {}, wants = {}, engaged = {};
    allFeedback.forEach((f) => {
        if (f.feeling) feelings[f.feeling] = (feelings[f.feeling] || 0) + 1;
        if (f.stoodOut) stoodOut[f.stoodOut] = (stoodOut[f.stoodOut] || 0) + 1;
        if (f.wantMore) wants[f.wantMore] = (wants[f.wantMore] || 0) + 1;
        if (f.engageAgain) engaged[f.engageAgain] = (engaged[f.engageAgain] || 0) + 1;
    });
    const top = (m) => Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    const tf = top(feelings), ts = top(stoodOut), tw = top(wants), te = top(engaged);

    dnaGrid.innerHTML = `
        ${dnaCard('Dominant Feeling', tf ? tf[0] : '—', tf ? pct(tf[1], allFeedback.length) + '% of responses' : '')}
        ${dnaCard('Most Valued Element', ts ? ts[0] : '—', ts ? pct(ts[1], allFeedback.length) + '% selected this' : '')}
        ${dnaCard('Preferred Content Type', tw ? tw[0] : '—', tw ? pct(tw[1], allFeedback.length) + '% requested' : '')}
        ${dnaCard('Repeat Engagement', te ? te[0] : '—', te ? pct(te[1], allFeedback.length) + '% responded' : '')}
    `;
}
function dnaCard(title, value, desc) {
    return `
        <div class="dna-card">
            <span class="card-title">${escapeHTML(title)}</span>
            <span class="card-value">${escapeHTML(value)}</span>
            ${desc ? `<span class="card-desc">${escapeHTML(desc)}</span>` : ''}
        </div>
    `;
}

/* ============================================================
   PATTERNS
   ============================================================ */
function renderPatterns() {
    if (!patternGrid) return;
    const total = allFeedback.length;
    if (total < 10) {
        patternGrid.innerHTML = emptyState(
            '<circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>',
            'Not enough data for reliable patterns',
            'At least 10 responses required'
        );
        return;
    }

    const patterns = [];
    const correlations = [
        { a: 'feeling', b: 'engageAgain', label: 'Feeling ↔ Repeat Intent' },
        { a: 'feeling', b: 'wouldWatchMore', label: 'Feeling ↔ Future Interest' },
        { a: 'rating', b: 'engageAgain', label: 'Rating ↔ Repeat Intent' },
        { a: 'stoodOut', b: 'rating', label: 'Stood Out ↔ Rating' }
    ];
    // Simple co-occurrence counts — illustrative, not statistical
    patternGrid.innerHTML = patterns.length
        ? patterns.map((p) => `<div class="pattern-card"><span class="card-title">${escapeHTML(p.label)}</span><span class="card-desc">${escapeHTML(p.desc)}</span></div>`).join('')
        : `<div class="pattern-card"><span class="card-title">Pattern detection ready</span><span class="card-desc">Patterns will be shown once there are enough paired responses across questions.</span></div>`;
}

/* ============================================================
   CONTRADICTIONS
   ============================================================ */
function renderContradictions() {
    if (!contradictList) return;
    const total = allFeedback.length;
    const items = [];
    if (total >= 5) {
        const highRatingLowRepeat = allFeedback.filter((f) => Number(f.rating) >= 4 && (f.engageAgain || '').toLowerCase().startsWith('unlikely')).length;
        if (highRatingLowRepeat >= 2) {
            items.push({
                cls: 'warning',
                title: 'High rating, low repeat intent',
                desc: highRatingLowRepeat + ' responses rated 4 or 5 but indicated low likelihood of engaging again.',
                meta: ['Repeats: ' + highRatingLowRepeat, 'Total: ' + total]
            });
        }
        const happyButImprove = allFeedback.filter((f) => Number(f.rating) >= 4 && (f.improve || '').trim() && (f.improve || '').toLowerCase() !== 'nothing').length;
        if (happyButImprove >= 3) {
            items.push({
                cls: 'info',
                title: 'High satisfaction but repeated improvement feedback',
                desc: happyButImprove + ' responses rated positively but suggested an improvement.',
                meta: ['Count: ' + happyButImprove]
            });
        }
    }
    if (!items.length) {
        contradictList.innerHTML = emptyState(
            '<circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/>',
            'No contradictions detected'
        );
        return;
    }
    contradictList.innerHTML = items.map((i) => `
        <div class="alert-item alert-item--${i.cls}">
            <div class="alert-title">${escapeHTML(i.title)}</div>
            <div class="alert-desc">${escapeHTML(i.desc)}</div>
            <div class="alert-meta">${i.meta.map((m) => `<span class="action-tag">${escapeHTML(m)}</span>`).join('')}</div>
        </div>
    `).join('');
}

/* ============================================================
   FATIGUE
   ============================================================ */
function renderFatigue() {
    if (!fatigueList) return;
    const total = allFeedback.length;
    if (total < 10) {
        fatigueList.innerHTML = emptyState(
            '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>',
            'Insufficient data for fatigue analysis'
        );
        return;
    }
    const now = Date.now();
    const last7 = allFeedback.filter((f) => now - (new Date(f.submittedAt).getTime() || 0) <= 7 * 864e5);
    const prev7 = allFeedback.filter((f) => {
        const t = new Date(f.submittedAt).getTime() || 0;
        return now - t > 7 * 864e5 && now - t <= 14 * 864e5;
    });
    if (!prev7.length) {
        fatigueList.innerHTML = emptyState(
            '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>',
            'Need two weeks of data to detect fatigue'
        );
        return;
    }
    const currAvg = last7.length ? last7.reduce((s, f) => s + Number(f.rating || 0), 0) / last7.length : 0;
    const prevAvg = prev7.reduce((s, f) => s + Number(f.rating || 0), 0) / prev7.length;
    const delta = prevAvg ? ((currAvg - prevAvg) / prevAvg) * 100 : 0;
    if (delta <= -10) {
        fatigueList.innerHTML = `
            <div class="alert-item alert-item--warning">
                <div class="alert-title">Rating decline detected</div>
                <div class="alert-desc">Recent week's average rating is ${delta.toFixed(1)}% lower than prior week.</div>
            </div>
        `;
    } else {
        fatigueList.innerHTML = emptyState(
            '<polyline points="20 6 9 17 4 12"/>',
            'No fatigue signals detected'
        );
    }
}

/* ============================================================
   MOMENTUM
   ============================================================ */
function renderMomentum() {
    if (!momentumGrid) return;
    if (allFeedback.length < 5 || savedReels.length < 2) {
        momentumGrid.innerHTML = emptyState(
            '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
            'Insufficient data for momentum analysis'
        );
        return;
    }
    // Sort reels by latest feedback timestamp
    const reelStats = savedReels.map((r) => {
        const items = allFeedback.filter((f) => f.reelId === r.id);
        const latest = items.reduce((m, f) => Math.max(m, new Date(f.submittedAt).getTime() || 0), 0);
        const rated = items.filter((f) => f.rating != null);
        const avg = rated.length ? rated.reduce((s, f) => s + Number(f.rating || 0), 0) / rated.length : 0;
        return { id: r.id, title: r.title, count: items.length, avg, latest };
    }).filter((r) => r.count >= 2).sort((a, b) => b.latest - a.latest);

    if (reelStats.length < 2) {
        momentumGrid.innerHTML = emptyState(
            '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
            'Need at least 2 reels with 2+ responses each'
        );
        return;
    }
    momentumGrid.innerHTML = reelStats.slice(0, 6).map((r) => `
        <div class="momentum-card">
            <span class="card-title">${escapeHTML(r.id)}</span>
            <span class="card-value">${r.avg.toFixed(1)} / 5</span>
            <span class="card-desc">${r.count} responses</span>
        </div>
    `).join('');
}

/* ============================================================
   OPPORTUNITIES
   ============================================================ */
function renderOpportunities() {
    if (!opportunityGrid) return;
    if (!allFeedback.length) {
        opportunityGrid.innerHTML = emptyState(
            '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
            'No opportunities detected yet'
        );
        return;
    }
    const wants = {};
    allFeedback.forEach((f) => {
        const k = (f.wantMore || '').trim();
        if (k) wants[k] = (wants[k] || 0) + 1;
    });
    const sorted = Object.entries(wants).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) {
        opportunityGrid.innerHTML = emptyState(
            '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
            'No opportunity signals yet'
        );
        return;
    }
    opportunityGrid.innerHTML = sorted.slice(0, 4).map(([k, v]) => `
        <div class="opportunity-card">
            <span class="card-title">Content Opportunity</span>
            <span class="card-value">${escapeHTML(k)}</span>
            <span class="card-desc">Requested by ${pct(v, allFeedback.length)}% of audience</span>
        </div>
    `).join('');
}

/* ============================================================
   RISKS
   ============================================================ */
function renderRisks() {
    if (!riskList) return;
    const total = allFeedback.length;
    if (total < 5) {
        riskList.innerHTML = emptyState(
            '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
            'No risks detected'
        );
        return;
    }
    const negRate = pct(allFeedback.filter((f) => Number(f.rating) <= 2).length, total);
    const improveRate = pct(allFeedback.filter((f) => (f.improve || '').trim() && (f.improve || '').toLowerCase() !== 'nothing').length, total);

    const items = [];
    if (negRate >= 25) items.push({ cls: 'warning', title: 'Elevated negative rating rate', desc: negRate + '% of responses rated 2 or below.' });
    if (improveRate >= 40) items.push({ cls: 'info', title: 'Frequent improvement requests', desc: improveRate + '% of audience suggested an improvement.' });

    if (!items.length) {
        riskList.innerHTML = emptyState(
            '<polyline points="20 6 9 17 4 12"/>',
            'No risks detected'
        );
        return;
    }
    riskList.innerHTML = items.map((i) => `
        <div class="alert-item alert-item--${i.cls}">
            <div class="alert-title">${escapeHTML(i.title)}</div>
            <div class="alert-desc">${escapeHTML(i.desc)}</div>
        </div>
    `).join('');
}

/* ============================================================
   AUDIENCE VOICE
   ============================================================ */
function renderVoice() {
    if (!voiceGrid) return;
    const written = allFeedback.filter((f) => (f.message || '').trim());
    if (!written.length) {
        voiceGrid.innerHTML = emptyState(
            '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
            'No written feedback yet'
        );
        return;
    }
    const words = {};
    const stop = new Set(['the','a','an','and','or','but','is','are','was','were','to','of','in','on','for','with','at','by','from','this','that','it','i','you','we','they','he','she','very','so','too','my','your','our','their','as','if','then','than','be','been','has','have','had','not','no','do','does','did','can','could','would','should','will','just','only','also','well','like']);
    written.forEach((f) => {
        (f.message || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).forEach((w) => {
            if (w.length >= 3 && !stop.has(w)) words[w] = (words[w] || 0) + 1;
        });
    });
    const top = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 8);
    voiceGrid.innerHTML = top.map(([w, c]) => `
        <div class="voice-card">
            <span class="card-title">Common Theme</span>
            <span class="card-value">${escapeHTML(w)}</span>
            <span class="card-desc">Mentioned ${c} time${c === 1 ? '' : 's'}</span>
        </div>
    `).join('');
}

/* ============================================================
   PORTFOLIO
   ============================================================ */
function renderPortfolio() {
    if (!portfolioGrid) return;
    if (!savedReels.length) {
        portfolioGrid.innerHTML = emptyState(
            '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
            'No portfolio data yet'
        );
        return;
    }
    const buckets = { winners: [], potential: [], stable: [], experimental: [], under: [] };
    savedReels.forEach((r) => {
        const stats = computeReelStats(r.id);
        if (!stats || stats.total < 3) buckets.experimental.push(r.id);
        else if (stats.avg >= 4.5 && stats.recommend >= 70) buckets.winners.push(r.id);
        else if (stats.avg >= 4) buckets.potential.push(r.id);
        else if (stats.avg >= 3) buckets.stable.push(r.id);
        else buckets.under.push(r.id);
    });
    const cats = [
        { name: 'Core Winners', list: buckets.winners },
        { name: 'High Potential', list: buckets.potential },
        { name: 'Stable', list: buckets.stable },
        { name: 'Experimental', list: buckets.experimental },
        { name: 'Underperforming', list: buckets.under }
    ].filter((c) => c.list.length);

    if (!cats.length) {
        portfolioGrid.innerHTML = emptyState(
            '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
            'No classification yet'
        );
        return;
    }
    portfolioGrid.innerHTML = cats.map((c) => `
        <div class="portfolio-card">
            <span class="card-title">${escapeHTML(c.name)}</span>
            <span class="card-value">${c.list.length} reel${c.list.length === 1 ? '' : 's'}</span>
            <span class="card-desc">${c.list.map(escapeHTML).join(', ')}</span>
        </div>
    `).join('');
}

/* ============================================================
   LIFECYCLE
   ============================================================ */
function renderLifecycle() {
    if (!lifecycleGrid) return;
    if (allFeedback.length < 5) {
        lifecycleGrid.innerHTML = emptyState(
            '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
            'No lifecycle data yet'
        );
        return;
    }
    lifecycleGrid.innerHTML = `
        <div class="lifecycle-card">
            <span class="card-title">Pattern Status</span>
            <span class="card-value">Emerging</span>
            <span class="card-desc">Not enough time-series data to confirm lifecycle stages.</span>
        </div>
    `;
}

/* ============================================================
   ASK YOUR DATA
   ============================================================ */
const ASK_QUESTIONS = [
    { id: 'strongest', q: 'What are my strongest reel patterns?' },
    { id: 'decline', q: 'Why did recent reel performance decline?' },
    { id: 'emotion', q: 'Which emotional responses link with recommendation?' },
    { id: 'content', q: 'What type of content should I make more of?' },
    { id: 'attention', q: 'Which reels need attention?' },
    { id: 'changed', q: 'What changed in the last 30 days?' }
];

function renderAskGrid() {
    if (!askGrid) return;
    askGrid.innerHTML = ASK_QUESTIONS.map((q) => `
        <button type="button" class="ask-btn" data-ask="${q.id}">
            ${escapeHTML(q.q)}
        </button>
    `).join('');
    askGrid.querySelectorAll('.ask-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            askGrid.querySelectorAll('.ask-btn').forEach((b) => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            answerAsk(btn.dataset.ask);
        });
    });
    if (askResponse) {
        askResponse.textContent = 'Select a question to generate an answer from real feedback data.';
    }
}

function answerAsk(id) {
    if (!askResponse) return;
    const total = allFeedback.length;
    if (!total) {
        askResponse.textContent = 'No feedback data available yet.';
        return;
    }
    let answer = '';
    if (id === 'strongest') {
        const feelings = {};
        allFeedback.forEach((f) => { if (f.feeling) feelings[f.feeling] = (feelings[f.feeling] || 0) + 1; });
        const top = Object.entries(feelings).sort((a, b) => b[1] - a[1])[0];
        answer = top
            ? 'Your strongest pattern is content that evokes "' + top[0] + '" — it appears in ' + pct(top[1], total) + '% of responses.'
            : 'Not enough feeling data to determine a pattern.';
    } else if (id === 'decline') {
        const now = Date.now();
        const last7 = allFeedback.filter((f) => now - (new Date(f.submittedAt).getTime() || 0) <= 7 * 864e5);
        const prev7 = allFeedback.filter((f) => {
            const t = new Date(f.submittedAt).getTime() || 0;
            return now - t > 7 * 864e5 && now - t <= 14 * 864e5;
        });
        if (prev7.length < 3 || last7.length < 3) {
            answer = 'Not enough data in the last 2 weeks to determine a decline.';
        } else {
            const a = last7.reduce((s, f) => s + Number(f.rating || 0), 0) / last7.length;
            const b = prev7.reduce((s, f) => s + Number(f.rating || 0), 0) / prev7.length;
            answer = a >= b
                ? 'Recent performance is not declining — average rating is ' + a.toFixed(1) + ' vs ' + b.toFixed(1) + ' in the prior week.'
                : 'Recent average rating is ' + a.toFixed(1) + ' vs ' + b.toFixed(1) + ' — a decline of ' + ((b - a) / b * 100).toFixed(1) + '%.';
        }
    } else if (id === 'emotion') {
        const emotional = allFeedback.filter((f) => ['Peaceful','Devotional','Emotional','Inspired','Calm','Deeply moved'].includes((f.feeling || '').trim()));
        const recYes = emotional.filter((f) => {
            const v = (f.wouldWatchMore || f.more || '').toLowerCase();
            return v.startsWith('definitely') || v.startsWith('yes');
        }).length;
        answer = emotional.length
            ? pct(recYes, emotional.length) + '% of emotionally engaged respondents want more content like this.'
            : 'Not enough emotional responses to determine a pattern.';
    } else if (id === 'content') {
        const wants = {};
        allFeedback.forEach((f) => { if (f.wantMore) wants[f.wantMore] = (wants[f.wantMore] || 0) + 1; });
        const top = Object.entries(wants).sort((a, b) => b[1] - a[1])[0];
        answer = top
            ? 'Audience is asking for "' + top[0] + '" — ' + pct(top[1], total) + '% requested it.'
            : 'No specific content preference is dominant yet.';
    } else if (id === 'attention') {
        const needsAttention = savedReels.filter((r) => {
            const s = computeReelStats(r.id);
            return s && s.total >= 3 && s.avg < 3.5;
        }).map((r) => r.id);
        answer = needsAttention.length
            ? 'Reels needing attention: ' + needsAttention.join(', ') + '.'
            : 'No reels currently show weak performance with sufficient sample size.';
    } else if (id === 'changed') {
        const now = Date.now();
        const recent = allFeedback.filter((f) => now - (new Date(f.submittedAt).getTime() || 0) <= 30 * 864e5);
        answer = recent.length
            ? recent.length + ' responses arrived in the last 30 days. Average rating: ' + (recent.reduce((s, f) => s + Number(f.rating || 0), 0) / recent.length).toFixed(1) + '.'
            : 'No responses in the last 30 days.';
    }
    askResponse.textContent = answer;
}

/* ============================================================
   ACTION CENTER
   ============================================================ */
function renderActionCenter() {
    if (!actionList) return;
    const total = allFeedback.length;
    const actions = [];

    if (total === 0) {
        actions.push({
            type: 'monitor',
            title: 'Collect initial responses',
            reason: 'No feedback has been received yet. Share your reel links to begin.',
            tags: []
        });
    } else {
        // Repeat: strongest reel
        if (savedReels.length) {
            const best = savedReels.map((r) => ({ id: r.id, stats: computeReelStats(r.id) }))
                .filter((x) => x.stats && x.stats.total >= 3)
                .sort((a, b) => b.stats.avg - a.stats.avg)[0];
            if (best && best.stats.avg >= 4) {
                actions.push({
                    type: 'repeat',
                    title: 'Repeat winning pattern in ' + best.id,
                    reason: 'Averaged ' + best.stats.avg.toFixed(1) + '/5 across ' + best.stats.total + ' responses with ' + best.stats.recommend + '% recommendation.',
                    tags: [best.id, best.stats.recommend + '% recommend']
                });
            }

            // Improve: weakest reel
            const worst = savedReels.map((r) => ({ id: r.id, stats: computeReelStats(r.id) }))
                .filter((x) => x.stats && x.stats.total >= 3)
                .sort((a, b) => a.stats.avg - b.stats.avg)[0];
            if (worst && worst.stats.avg < 3.5) {
                actions.push({
                    type: 'improve',
                    title: 'Review content in ' + worst.id,
                    reason: 'Averaged ' + worst.stats.avg.toFixed(1) + '/5 with ' + worst.stats.total + ' responses.',
                    tags: [worst.id]
                });
            }
        }

        // Investigate: contradiction
        const highRatingLowRepeat = allFeedback.filter((f) => Number(f.rating) >= 4 && (f.engageAgain || '').toLowerCase().startsWith('unlikely')).length;
        if (highRatingLowRepeat >= 2) {
            actions.push({
                type: 'investigate',
                title: 'Investigate satisfaction-repeat gap',
                reason: highRatingLowRepeat + ' high-rated responses also indicated low repeat intent.',
                tags: ['Repeats: ' + highRatingLowRepeat]
            });
        }

        // Experiment: emerging content
        const wants = {};
        allFeedback.forEach((f) => { if (f.wantMore) wants[f.wantMore] = (wants[f.wantMore] || 0) + 1; });
        const topWant = Object.entries(wants).sort((a, b) => b[1] - a[1])[0];
        if (topWant && topWant[1] >= 3) {
            actions.push({
                type: 'experiment',
                title: 'Test new content: ' + topWant[0],
                reason: pct(topWant[1], total) + '% of audience requested this type.',
                tags: [topWant[0]]
            });
        }

        // Monitor: low confidence
        if (total < 20) {
            actions.push({
                type: 'monitor',
                title: 'Continue collecting responses',
                reason: 'Current sample size is ' + total + ' responses. Larger samples improve reliability.',
                tags: ['Sample: ' + total]
            });
        }
    }

    actionList.innerHTML = actions.map((a) => `
        <div class="action-item">
            <span class="action-badge action-badge--${a.type}">${escapeHTML(a.type)}</span>
            <div class="action-body">
                <span class="action-title">${escapeHTML(a.title)}</span>
                <span class="action-reason">${escapeHTML(a.reason)}</span>
                ${a.tags && a.tags.length ? `<div class="action-meta">${a.tags.map((t) => `<span class="action-tag">${escapeHTML(t)}</span>`).join('')}</div>` : ''}
            </div>
        </div>
    `).join('');
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
    reelManual.hidden = true;
    reelPreview.hidden = true;

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

    try {
        const res = await fetch('/api/reel-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        let data = {};
        try { data = await res.json(); } catch (_) {}

        if (!res.ok || !data.ok) {
            const code = data.error || 'unknown';
            if (code === 'invalid_url') {
                reelUrlError.textContent = data.message || 'This is not a valid Facebook Reel URL.';
            } else if (code === 'server_config') {
                reelUrlError.textContent = 'Server is not configured with a Facebook access token. The administrator must set FB_ACCESS_TOKEN.';
            } else if (code === 'meta_unavailable') {
                reelUrlError.textContent = data.message
                    ? 'Facebook did not return metadata: ' + data.message
                    : 'Facebook did not return metadata for this Reel. This may be a private or restricted Reel.';
            } else if (code === 'network') {
                reelUrlError.textContent = 'Network error while contacting the server. Please try again.';
            } else {
                reelUrlError.textContent = data.message || 'Unable to fetch metadata.';
            }
            reelManual.hidden = false;
            reelTitleInput.focus();
            return;
        }

        reelTitleInput.value = data.title || '';
        reelThumbInput.value = data.thumbnail || '';

        if (!data.title) {
            reelUrlError.textContent = 'Title could not be retrieved. Please enter one manually.';
            reelManual.hidden = false;
            reelTitleInput.focus();
            return;
        }

        pendingReel = {
            url: data.url || url,
            title: data.title,
            thumbnail: data.thumbnail || ''
        };

        reelManual.hidden = false;
        renderPreview(pendingReel);
    } catch (err) {
        console.error('Fetch error:', err);
        reelUrlError.textContent = 'Could not reach the metadata service. Check your connection.';
        reelManual.hidden = false;
    } finally {
        card.classList.remove('is-processing');
        fetchReel.classList.remove('is-loading');
        fetchReel.disabled = false;
        fetchLabel.textContent = 'Fetch Details';
    }
}
function buildPreviewFromManual(url) {
    const title = reelTitleInput.value.trim();
    if (!title) { reelPreview.hidden = true; return; }
    pendingReel = { url, title, thumbnail: reelThumbInput.value.trim() };
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

async function generateNextReelId() {
    const counterRef = ref(db, 'counters/reelCounter');
    const result = await runTransaction(counterRef, (current) => {
        return (typeof current === 'number' ? current : 0) + 1;
    });
    if (!result.committed) throw new Error('Counter transaction failed');
    return 'RB' + String(result.snapshot.val()).padStart(3, '0');
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
if (reelTitleInput) reelTitleInput.addEventListener('input', () => buildPreviewFromManual(reelUrl.value.trim()));
if (reelThumbInput) reelThumbInput.addEventListener('input', () => buildPreviewFromManual(reelUrl.value.trim()));
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && addReelModal && !addReelModal.hidden) closeReelModal();
});

[searchInput, filterRating, filterDate, sortBy].forEach((el) => {
    if (!el) return;
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', renderList);
});

function decodeHtml(str) {
    const el = document.createElement('textarea');
    el.innerHTML = str;
    return el.value;
}

/* Initial render */
renderReels();
renderList();
showLogin();
