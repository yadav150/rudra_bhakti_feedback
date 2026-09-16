/* ============================================================
   RUDRA BHAKTI — FEEDBACK LIST
   Native integration. Silent auth. Blue loader (zero CLS).
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getDatabase, ref, onValue }
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

/* ============================================================
   PREFETCH NAV PAGES ON HOVER / TOUCH
   Fires only on user intent. Makes next page load instant.
   ============================================================ */
(function prefetchNav() {
    const seen = new Set();
    const prefetch = (href) => {
        if (!href || href.startsWith('#') || href.startsWith('http')) return;
        if (seen.has(href)) return;
        seen.add(href);
        if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
        const l = document.createElement('link');
        l.rel = 'prefetch';
        l.href = href;
        document.head.appendChild(l);
    };
    document.addEventListener('mouseover', (e) => {
        const a = e.target.closest('a[href$=".html"]');
        if (a) prefetch(a.getAttribute('href'));
    }, { passive: true });
    document.addEventListener('touchstart', (e) => {
        const a = e.target.closest('a[href$=".html"]');
        if (a) prefetch(a.getAttribute('href'));
    }, { passive: true });
})();

const ADMIN_UID = 'ukvRTL3B3WOoasKnJI7t6USMeUF3';
const FEEDBACK_PER_PAGE = 10;

/* ============================================================
   PAGE LOADER
   ============================================================ */
let __loaderDone = false;

function markReady() {
    if (__loaderDone) return;
    __loaderDone = true;
    const loader = document.getElementById('pageLoader');
    if (!loader) return;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => loader.classList.add('is-hidden'));
    });
}

function hideLoaderNow() {
    __loaderDone = true;
    const loader = document.getElementById('pageLoader');
    if (loader) loader.classList.add('is-hidden');
}

setTimeout(markReady, 2000);

/* ============================================================
   DOM
   ============================================================ */
const $ = (id) => document.getElementById(id);

const dash = $('dash');
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

const searchInput = $('searchInput');
const filterRating = $('filterRating');
const filterDate = $('filterDate');
const sortBy = $('sortBy');
const resultCount = $('resultCount');
const feedbackList = $('feedbackList');

/* ============================================================
   STATE
   ============================================================ */
let allFeedback = [];
let unsubFeedback = null;
let feedbackPage = 1;

/* ============================================================
   AUTH — silent
   ============================================================ */
onAuthStateChanged(auth, (user) => {
    if (!user || user.uid !== ADMIN_UID) {
        stopListeners();
        hideLoaderNow();
        window.location.replace('admin.html');
        return;
    }
    if (drawerUserEmail) drawerUserEmail.textContent = user.email || 'Administrator';
    dash.hidden = false;
    startListeners();
});

/* ============================================================
   LOGOUT / DRAWER
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

/* ============================================================
   LISTENERS
   ============================================================ */
function startListeners() {
    stopListeners();

    unsubFeedback = onValue(ref(db, 'feedback'), (snap) => {
        allFeedback = [];
        snap.forEach((child) => {
            const v = child.val() || {};
            allFeedback.push({
                id: child.key,
                ...v,
                isAnonymous: typeof v.isAnonymous === 'boolean'
                    ? v.isAnonymous
                    : (!v.name || v.name === 'Anonymous' || /^Anonymous \(/.test(v.name || ''))
            });
        });
        renderList();
        markReady();
    }, (err) => {
        console.error('Feedback listener error:', err);
        markReady();
    });
}

function stopListeners() {
    if (unsubFeedback) { unsubFeedback(); unsubFeedback = null; }
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
   FILTER
   ============================================================ */
function getFiltered() {
    let list = [...allFeedback];

    const q = (searchInput?.value || '').trim().toLowerCase();
    if (q) {
        list = list.filter((f) =>
            (f.name || '').toLowerCase().includes(q) ||
            (f.email || '').toLowerCase().includes(q) ||
            (f.message || '').toLowerCase().includes(q) ||
            (f.reelId || '').toLowerCase().includes(q) ||
            (f.reelTitle || '').toLowerCase().includes(q)
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

/* ============================================================
   RENDER
   ============================================================ */
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
                <h3>No feedback found</h3>
                <p>Try adjusting filters, or feedback will appear here once users start responding.</p>
            </div>
        `;
        const pg = document.getElementById('feedbackPagination');
        if (pg) pg.hidden = true;
        return;
    }

    const totalPages = Math.max(1, Math.ceil(list.length / FEEDBACK_PER_PAGE));
    if (feedbackPage > totalPages) feedbackPage = totalPages;
    if (feedbackPage < 1) feedbackPage = 1;

    const start = (feedbackPage - 1) * FEEDBACK_PER_PAGE;
    const pageItems = list.slice(start, start + FEEDBACK_PER_PAGE);

    feedbackList.innerHTML = pageItems.map(renderRow).join('');

    renderPagination('feedbackPagination', feedbackPage, totalPages, (p) => {
        feedbackPage = p;
        renderList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
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
                ${item('Would watch more', f.more || f.wouldWatchMore)}
                ${item('Wants more of', f.wantMore)}
                ${item('Engage again', f.engageAgain)}
                ${item('Connected with', f.connectedWith)}
                ${item('Stood out', f.stoodOut)}
                ${item('Held interest', f.heldInterest)}
                ${item('Presentation', f.presentation)}
                ${item('Improve', f.improve)}
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
   BINDINGS
   ============================================================ */
[searchInput, filterRating, filterDate, sortBy].forEach((el) => {
    if (!el) return;
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
        feedbackPage = 1;
        renderList();
    });
});
