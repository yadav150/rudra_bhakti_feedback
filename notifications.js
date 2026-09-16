/* ============================================================
   RUDRA BHAKTI — NOTIFICATIONS
   Real-time feedback alerts. Fully dynamic from Firebase.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getDatabase, ref, onValue, set, update }
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
const BASE_TITLE = 'Notifications — Rudra Bhakti Admin';
const PER_PAGE = 15;

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

const menuBtn = $('menuBtn');
const drawer = $('drawer');
const drawerBackdrop = $('drawerBackdrop');
const drawerClose = $('drawerClose');
const drawerLogout = $('drawerLogout');

const logoutModal = $('logoutModal');
const logoutBackdrop = $('logoutBackdrop');
const logoutCancel = $('logoutCancel');
const logoutConfirm = $('logoutConfirm');

const notifList = $('notifList');
const notifEmpty = $('notifEmpty');
const notifEmptyTitle = $('notifEmptyTitle');
const notifEmptyText = $('notifEmptyText');
const notifCount = $('notifCount');
const notifUnread = $('notifUnread');
const filterNotif = $('filterNotif');
const markAllReadBtn = $('markAllRead');

/* ============================================================
   STATE
   ============================================================ */
let allFeedback = [];
let savedReels = [];
let readIds = new Set();

let unsubFeedback = null;
let unsubReels = null;
let unsubRead = null;

let firstFeedbackSnapshot = true;
let lastMaxTs = 0;

let currentPage = 1;

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
        stopListeners();
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
    startListeners();
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
        document.title = BASE_TITLE;
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

/* ============================================================
   REALTIME LISTENERS
   ============================================================ */
function startListeners() {
    stopListeners();
    firstFeedbackSnapshot = true;
    lastMaxTs = 0;

    unsubReels = onValue(ref(db, 'reels'), (snap) => {
        savedReels = [];
        snap.forEach((child) => {
            savedReels.push({ id: child.key, ...child.val() });
        });
        renderAll();
    }, (err) => console.error('Reels listener error:', err));

    unsubFeedback = onValue(ref(db, 'feedback'), (snap) => {
        const items = [];
        let maxTs = 0;
        snap.forEach((child) => {
            const v = child.val() || {};
            items.push({ id: child.key, ...v });
            const ts = Number(v.submittedAt) || 0;
            if (ts > maxTs) maxTs = ts;
        });

        if (!firstFeedbackSnapshot && maxTs > lastMaxTs) {
            playBeep();
        }
        lastMaxTs = maxTs;
        firstFeedbackSnapshot = false;

        items.sort((a, b) => (Number(b.submittedAt) || 0) - (Number(a.submittedAt) || 0));
        allFeedback = items;
        renderAll();
    }, (err) => console.error('Feedback listener error:', err));

    unsubRead = onValue(ref(db, 'adminNotifications/readIds'), (snap) => {
        readIds = new Set();
        if (snap.exists()) {
            snap.forEach((child) => {
                readIds.add(child.key);
            });
        }
        renderAll();
    }, (err) => console.error('ReadIds listener error:', err));
}

function stopListeners() {
    if (unsubReels) { unsubReels(); unsubReels = null; }
    if (unsubFeedback) { unsubFeedback(); unsubFeedback = null; }
    if (unsubRead) { unsubRead(); unsubRead = null; }
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
function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - Number(ts);
    if (diff < 0) return 'just now';
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return hrs + ' hr' + (hrs === 1 ? '' : 's') + ' ago';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + ' day' + (days === 1 ? '' : 's') + ' ago';
    return formatDate(ts);
}
function getReelTitle(feedback) {
    if (feedback.reelTitle) return feedback.reelTitle;
    const reel = savedReels.find((r) => r.id === feedback.reelId);
    return reel && reel.title ? reel.title : '';
}

/* ============================================================
   AUDIO BEEP
   ============================================================ */
let audioCtx = null;

function ensureAudio() {
    if (audioCtx) return audioCtx;
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
    } catch (e) {
        console.warn('AudioContext init failed:', e);
        return null;
    }
    return audioCtx;
}

function playBeep() {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1175, now + 0.12);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) {
        console.warn('Beep failed:', e);
    }
}

/* User gesture se audio unlock */
document.addEventListener('click', () => {
    const ctx = ensureAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}, { once: false, passive: true });

/* ============================================================
   RENDER ALL
   ============================================================ */
function renderAll() {
    updateTitle();
    updateStats();
    renderList();
}

function updateTitle() {
    const unread = countUnread();
    document.title = unread > 0 ? '(' + unread + ') ' + BASE_TITLE : BASE_TITLE;
}

function countUnread() {
    let n = 0;
    allFeedback.forEach((f) => { if (!readIds.has(f.id)) n++; });
    return n;
}

function updateStats() {
    const total = allFeedback.length;
    const unread = countUnread();
    if (notifCount) notifCount.textContent = total + ' notification' + (total === 1 ? '' : 's');
    if (notifUnread) notifUnread.textContent = unread + ' unread';
}

/* ============================================================
   FILTERS
   ============================================================ */
function getFiltered() {
    let list = [...allFeedback];
    const f = filterNotif?.value || 'all';
    if (f === 'unread') {
        list = list.filter((x) => !readIds.has(x.id));
    } else if (f === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        list = list.filter((x) => new Date(x.submittedAt).getTime() >= today.getTime());
    } else if (f === '7d') {
        const cutoff = Date.now() - 7 * 864e5;
        list = list.filter((x) => new Date(x.submittedAt).getTime() >= cutoff);
    }
    return list;
}

/* ============================================================
   RENDER LIST
   ============================================================ */
function renderList() {
    if (!notifList || !notifEmpty) return;

    const list = getFiltered();

    if (!list.length) {
        notifList.hidden = true;
        notifList.innerHTML = '';
        notifEmpty.hidden = false;

        const f = filterNotif?.value || 'all';
        if (allFeedback.length === 0) {
            notifEmptyTitle.textContent = 'No notifications yet';
            notifEmptyText.textContent = 'Notifications will appear here whenever feedback is submitted.';
        } else if (f === 'unread') {
            notifEmptyTitle.textContent = 'All caught up';
            notifEmptyText.textContent = 'You have read every notification.';
        } else {
            notifEmptyTitle.textContent = 'No notifications in this filter';
            notifEmptyText.textContent = 'Try a different filter to see more notifications.';
        }

        const pg = document.getElementById('notifPagination');
        if (pg) pg.hidden = true;
        return;
    }

    notifEmpty.hidden = true;
    notifList.hidden = false;

    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * PER_PAGE;
    const items = list.slice(start, start + PER_PAGE);

    notifList.innerHTML = items.map(renderNotif).join('');

        notifList.querySelectorAll('[data-notif-id]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.dataset.notifId;
            if (id && !readIds.has(id)) markRead(id);
        });
    });

    notifList.querySelectorAll('[data-see-more]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.seeMore;
            if (!id) return;
            if (!readIds.has(id)) markRead(id);
            window.location.href = 'feedback-view.html?id=' + encodeURIComponent(id);
        });
    });

    renderPagination('notifPagination', currentPage, totalPages, (p) => {
        currentPage = p;
        renderList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function renderNotif(f) {
    const isUnread = !readIds.has(f.id);
    const reelLabel = f.reelId ? ('New feedback on ' + f.reelId) : 'New feedback';
    const reelTitle = getReelTitle(f);
    const rating = Number(f.rating) || 0;

    const safe = (v) => escapeHTML(v == null ? '' : String(v));

    const feelingVal = f.feeling ? safe(f.feeling) : '';
    const fromVal = safe(f.name || 'Anonymous');
    const messageVal = (f.message || '').trim();

    const metaItems = [];
    if (feelingVal) metaItems.push(rowItem('Feeling', feelingVal));
    metaItems.push(rowItem('From', fromVal));

    return `
        <article class="row notif-row${isUnread ? ' is-unread' : ''}"
                 data-notif-id="${safe(f.id)}"
                 role="button"
                 tabindex="0">
            <div class="row-top">
                <span class="notif-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                </span>
                <div class="notif-titles">
                    <span class="row-name">${safe(reelLabel)}</span>
                    ${reelTitle ? `<span class="notif-sub">${safe(reelTitle)}</span>` : ''}
                </div>
                ${isUnread ? '<span class="notif-new">New</span>' : ''}
                <span class="row-rating">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1z"/>
                    </svg>
                    ${safe(rating)} / 5
                </span>
            </div>
            <div class="row-grid">
                ${metaItems.join('')}
                ${messageVal ? `
                    <div class="row-item row-message">
                        <span class="row-item-label">Message</span>
                        <span class="row-item-value">${safe(messageVal)}</span>
                    </div>
                ` : ''}
            </div>
                        <div class="row-foot">
                <span>${safe(timeAgo(f.submittedAt))}</span>
                <span>${safe(formatDate(f.submittedAt))}</span>
            </div>
            <button type="button" class="notif-see-more" data-see-more="${safe(f.id)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                <span>See more</span>
            </button>
        </article>
    `;
}

function rowItem(label, value) {
    return `
        <div class="row-item">
            <span class="row-item-label">${escapeHTML(label)}</span>
            <span class="row-item-value">${escapeHTML(value)}</span>
        </div>
    `;
}

function renderPagination(containerId, current, total, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (total <= 1) {
        container.hidden = true;
        container.innerHTML = '';
        return;
    }
    container.hidden = false;
    container.innerHTML = `
        <button type="button" class="pg-btn" data-pg="prev" ${current === 1 ? 'disabled' : ''}>Prev</button>
        <span class="pg-info">Page ${current} of ${total}</span>
        <button type="button" class="pg-btn" data-pg="next" ${current === total ? 'disabled' : ''}>Next</button>
    `;
    const prev = container.querySelector('[data-pg="prev"]');
    const next = container.querySelector('[data-pg="next"]');
    if (prev) prev.addEventListener('click', () => onChange(current - 1));
    if (next) next.addEventListener('click', () => onChange(current + 1));
}

/* ============================================================
   MARK READ
   ============================================================ */
async function markRead(id) {
    if (!id || readIds.has(id)) return;
    try {
        await set(ref(db, 'adminNotifications/readIds/' + id), Date.now());
    } catch (err) {
        console.error('Mark read failed:', err);
    }
}

async function markAllRead() {
    const unread = allFeedback.filter((f) => !readIds.has(f.id));
    if (!unread.length) return;

    const updates = {};
    const stamp = Date.now();
    unread.forEach((f) => {
        updates['adminNotifications/readIds/' + f.id] = stamp;
    });

    const original = markAllReadBtn?.innerHTML;
    if (markAllReadBtn) {
        markAllReadBtn.disabled = true;
    }
    try {
        await update(ref(db), updates);
    } catch (err) {
        console.error('Mark all read failed:', err);
    } finally {
        if (markAllReadBtn) {
            markAllReadBtn.disabled = false;
            if (original) markAllReadBtn.innerHTML = original;
        }
    }
}

/* ============================================================
   BINDINGS
   ============================================================ */
if (filterNotif) {
    filterNotif.addEventListener('change', () => {
        currentPage = 1;
        renderList();
    });
}
if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', markAllRead);
}

/* Initial state */
showLogin();
