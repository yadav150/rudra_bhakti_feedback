/* ============================================================
   RUDRA BHAKTI — AUDIT SHELL / ROUTER
   16-section SPA. Silent auth. Shared state.
   ============================================================ */

import { auth, db, ADMIN_UID } from './firebase.js';
import { signOut, onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";

const $ = (id) => document.getElementById(id);

/* ============================================================
   SHARED STATE
   ============================================================ */
export const state = {
    reels: [],
    feedback: [],
    readIds: new Set(),
    auditLog: [],
    ready: false
};

let subs = [];
let __currentPage = null;
let __loaderDone = false;

/* ============================================================
   LOADER
   ============================================================ */
function markReady() {
    if (__loaderDone) return;
    __loaderDone = true;
    const loader = $('pageLoader');
    if (!loader) return;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => loader.classList.add('is-hidden'));
    });
}
function hideLoaderNow() {
    __loaderDone = true;
    const loader = $('pageLoader');
    if (loader) loader.classList.add('is-hidden');
}
setTimeout(markReady, 2000);
window.markReady = markReady;

/* ============================================================
   MODULE MAP (flat js/ folder)
   ============================================================ */
const PAGES = {
    'executive':      { el: 'page-executive',      load: () => import('./audit-executive.js') },
    'reels':          { el: 'page-reels',          load: () => import('./audit-reels.js') },
    'behaviour':      { el: 'page-behaviour',      load: () => import('./audit-behaviour.js') },
    'questions':      { el: 'page-questions',      load: () => import('./audit-questions.js') },
    'options':        { el: 'page-options',        load: () => import('./audit-options.js') },
    'trends':         { el: 'page-trends',         load: () => import('./audit-trends.js') },
    'relationships':  { el: 'page-relationships',  load: () => import('./audit-relationships.js') },
    'explorer':       { el: 'page-explorer',       load: () => import('./audit-explorer.js') },
    'trail':          { el: 'page-trail',          load: () => import('./audit-trail.js') },
    'integrity':      { el: 'page-integrity',      load: () => import('./audit-integrity.js') },
    'diagnostics':    { el: 'page-diagnostics',    load: () => import('./audit-diagnostics.js') },
    'auth':           { el: 'page-auth',           load: () => import('./audit-auth.js') },
    'firebase':       { el: 'page-firebase',       load: () => import('./audit-firebase.js') },
    'rules':          { el: 'page-rules',          load: () => import('./audit-rules.js') },
    'settings':       { el: 'page-settings',       load: () => import('./audit-settings.js') },
    'chatbot':        { el: 'page-chatbot',        load: () => import('./audit-chat.js') }
};

const moduleCache = {};

async function loadModule(page) {
    if (moduleCache[page]) return moduleCache[page];
    const cfg = PAGES[page];
    if (!cfg) return null;
    try {
        const mod = await cfg.load();
        moduleCache[page] = mod;
        if (typeof mod.init === 'function') {
            try { mod.init(state); } catch (e) { console.error('Module init error (' + page + '):', e); }
        }
        return mod;
    } catch (err) {
        console.error('Failed to load module:', page, err);
        return null;
    }
}

/* ============================================================
   ROUTER
   ============================================================ */
function getHashRoute() {
    const h = (location.hash || '').replace(/^#/, '').trim();
    if (!h) return { page: 'executive', params: {} };
    const qIndex = h.indexOf('?');
    if (qIndex >= 0) {
        const page = h.slice(0, qIndex);
        const params = {};
        new URLSearchParams(h.slice(qIndex + 1)).forEach((v, k) => { params[k] = v; });
        return { page, params };
    }
    return { page: h, params: {} };
}

function setActiveNav(page) {
    document.querySelectorAll('[data-page]').forEach((link) => {
        link.classList.toggle('is-active', link.dataset.page === page);
    });
}

function hideAllSections() {
    Object.values(PAGES).forEach((p) => {
        const el = document.getElementById(p.el);
        if (el) el.hidden = true;
    });
}

function showSection(page) {
    const cfg = PAGES[page];
    if (!cfg) return;
    const el = document.getElementById(cfg.el);
    if (el) el.hidden = false;
}

async function renderRoute(page, params = {}) {
    if (!PAGES[page]) page = 'executive';

    if (__currentPage === page && page !== 'chatbot') {
        hideAllSections();
        showSection(page);
        setActiveNav(page);
        return;
    }

    __currentPage = page;
    hideAllSections();
    showSection(page);
    setActiveNav(page);

    const mod = await loadModule(page);
    if (!mod) return;

    try {
        if (typeof mod.render === 'function') mod.render(state, params);
    } catch (err) {
        console.error('Render error for', page, err);
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
}

function navigate(page, params = {}) {
    if (!PAGES[page]) page = 'executive';
    let hash = '#' + page;
    if (params && Object.keys(params).length) {
        hash += '?' + new URLSearchParams(params).toString();
    }
    if (location.hash !== hash) location.hash = hash;
    renderRoute(page, params);
}

window.navigateTo = navigate;

function onHashChange() {
    const { page, params } = getHashRoute();
    renderRoute(page, params);
}
window.addEventListener('hashchange', onHashChange);

/* ============================================================
   NAV CLICKS
   ============================================================ */
document.querySelectorAll('[data-page]').forEach((link) => {
    link.addEventListener('click', (e) => {
        const page = link.dataset.page;
        if (!page) return;
        e.preventDefault();
        closeDrawer();
        navigate(page);
    });
});

/* ============================================================
   DRAWER
   ============================================================ */
function openDrawer() {
    const drawer = $('drawer');
    const backdrop = $('drawerBackdrop');
    const btn = $('menuBtn');
    if (!drawer) return;
    drawer.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}
function closeDrawer() {
    const drawer = $('drawer');
    const backdrop = $('drawerBackdrop');
    const btn = $('menuBtn');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

if ($('menuBtn')) $('menuBtn').addEventListener('click', () => {
    const drawer = $('drawer');
    drawer && drawer.classList.contains('is-open') ? closeDrawer() : openDrawer();
});
if ($('drawerClose')) $('drawerClose').addEventListener('click', closeDrawer);
if ($('drawerBackdrop')) $('drawerBackdrop').addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => {
    const drawer = $('drawer');
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) closeDrawer();
});

/* ============================================================
   LOGOUT MODAL
   ============================================================ */
function openLogoutModal() {
    const m = $('logoutModal');
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
}
function closeLogoutModal() {
    const m = $('logoutModal');
    if (!m) return;
    m.hidden = true;
    document.body.style.overflow = '';
}
async function performLogout() {
    closeLogoutModal();
    try { await signOut(auth); closeDrawer(); } catch (err) { console.error(err); }
}

if ($('logoutBtn')) $('logoutBtn').addEventListener('click', openLogoutModal);
if ($('drawerLogout')) $('drawerLogout').addEventListener('click', () => {
    closeDrawer();
    setTimeout(openLogoutModal, 220);
});
if ($('logoutCancel')) $('logoutCancel').addEventListener('click', closeLogoutModal);
if ($('logoutConfirm')) $('logoutConfirm').addEventListener('click', performLogout);
if ($('logoutBackdrop')) $('logoutBackdrop').addEventListener('click', closeLogoutModal);
document.addEventListener('keydown', (e) => {
    const m = $('logoutModal');
    if (e.key === 'Escape' && m && !m.hidden) closeLogoutModal();
});

/* ============================================================
   DATA LISTENERS
   ============================================================ */
function startListeners() {
    stopListeners();

    subs.push(onValue(ref(db, 'reels'), (snap) => {
        state.reels = [];
        snap.forEach((c) => state.reels.push({ id: c.key, ...c.val() }));
        state.reels.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
        refreshActive();
    }, (err) => console.error('Reels listener:', err)));

    subs.push(onValue(ref(db, 'feedback'), (snap) => {
        state.feedback = [];
        snap.forEach((c) => state.feedback.push({ id: c.key, ...c.val() }));
        refreshActive();
    }, (err) => console.error('Feedback listener:', err)));

    subs.push(onValue(ref(db, 'adminNotifications/readIds'), (snap) => {
        state.readIds = new Set();
        if (snap.exists()) snap.forEach((c) => state.readIds.add(c.key));
        refreshActive();
    }, (err) => console.error('readIds listener:', err)));

    subs.push(onValue(ref(db, 'auditLog'), (snap) => {
        state.auditLog = [];
        snap.forEach((c) => state.auditLog.push({ id: c.key, ...c.val() }));
        state.auditLog.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        refreshActive();
    }, (err) => console.error('auditLog listener:', err)));

    state.ready = true;
    markReady();
}

function stopListeners() {
    subs.forEach((u) => { try { u(); } catch (e) {} });
    subs = [];
}

let refreshTimer = null;
function refreshActive() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(async () => {
        refreshTimer = null;
        if (!__currentPage) return;
        const mod = moduleCache[__currentPage];
        if (!mod) return;
        try {
            if (typeof mod.render === 'function') mod.render(state, {});
        } catch (e) { console.error('Refresh render error:', e); }
    }, 120);
}

/* ============================================================
   AUTH
   ============================================================ */
onAuthStateChanged(auth, (user) => {
    if (!user || user.uid !== ADMIN_UID) {
        hideLoaderNow();
        window.location.replace('admin.html');
        return;
    }
    const emailEl = $('drawerUserEmail');
    if (emailEl) emailEl.textContent = user.email || 'Administrator';
    $('dash').hidden = false;

    startListeners();
    onHashChange();
});
