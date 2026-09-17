/* ============================================================
   RUDRA BHAKTI — SHELL / ROUTER
   Loader, auth, drawer, logout, section swap, hash routing
   ============================================================ */

import { auth, ADMIN_UID } from './firebase.js';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged }
    from "firebase/auth";

/* Page modules */
import * as Executive from './executive.js';
import * as Reels from './reels.js';
import * as Feedback from './feedback.js';
import * as ReelAnalysis from './reel-analysis.js';
import * as Notifications from './notifications.js';

/* ============================================================
   DOM
   ============================================================ */
const $ = (id) => document.getElementById(id);

const pageLoader = $('pageLoader');
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

const menuBtn = $('menuBtn');
const drawer = $('drawer');
const drawerBackdrop = $('drawerBackdrop');
const drawerClose = $('drawerClose');
const drawerLogout = $('drawerLogout');
const drawerUserEmail = $('drawerUserEmail');
const drawerAddReel = $('drawerAddReel');

const logoutBtn = $('logoutBtn');
const logoutModal = $('logoutModal');
const logoutBackdrop = $('logoutBackdrop');
const logoutCancel = $('logoutCancel');
const logoutConfirm = $('logoutConfirm');

const navLinks = document.querySelectorAll('[data-page]');
const externalLinks = document.querySelectorAll('[data-external]');

/* ============================================================
   STATE
   ============================================================ */
let __loaderDone = false;
let __currentPage = null;
let __lastViewedFeedbackId = null;

/* ============================================================
   LOADER
   ============================================================ */
function markReady() {
    if (__loaderDone) return;
    __loaderDone = true;
    if (!pageLoader) return;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => pageLoader.classList.add('is-hidden'));
    });
}

function hideLoaderNow() {
    __loaderDone = true;
    if (pageLoader) pageLoader.classList.add('is-hidden');
}

setTimeout(markReady, 2000);

/* ============================================================
   SCREEN SWITCH
   ============================================================ */
function showLogin() {
    if (loginWrap) loginWrap.hidden = false;
    if (forgotWrap) forgotWrap.hidden = true;
    if (dash) dash.hidden = true;
}
function showForgot() {
    if (loginWrap) loginWrap.hidden = true;
    if (forgotWrap) forgotWrap.hidden = false;
    if (dash) dash.hidden = true;
}
function showDash() {
    if (loginWrap) loginWrap.hidden = true;
    if (forgotWrap) forgotWrap.hidden = true;
    if (dash) dash.hidden = false;
}

/* ============================================================
   ROUTER
   ============================================================ */
const PAGES = {
    'executive':       { el: 'page-executive',       mod: Executive,       title: 'Executive' },
    'reels':           { el: 'page-reels',           mod: Reels,           title: 'Reels' },
    'feedback':        { el: 'page-feedback',        mod: Feedback,        title: 'Feedback' },
    'reel-analysis':   { el: 'page-reel-analysis',   mod: ReelAnalysis,    title: 'Reel Analysis' },
    'notifications':   { el: 'page-notifications',   mod: Notifications,   title: 'Notifications' }

function getHashRoute() {
    const h = (location.hash || '').replace(/^#/, '').trim();
    if (!h) return { page: 'executive', params: {} };

    /* feedback-view?id=xxx */
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
    navLinks.forEach((link) => {
        const isActive = link.dataset.page === page;
        link.classList.toggle('is-active', isActive);
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
    if (!el) return;
    el.hidden = false;
}

function navigate(page, params = {}, opts = {}) {
    if (!PAGES[page]) page = 'executive';

    /* Build hash */
    let hash = '#' + page;
    if (params && Object.keys(params).length) {
        hash += '?' + new URLSearchParams(params).toString();
    }
    if (opts.replace) {
        history.replaceState(null, '', hash);
        } else if (location.hash !== hash) {
        location.hash = hash;
    }

    renderRoute(page, params);
}

function renderRoute(page, params) {
    if (__currentPage === page && page !== 'feedback-view') {
        /* Already rendered — just re-show */
        hideAllSections();
        showSection(page);
        setActiveNav(page);
        return;
    }

    __currentPage = page;
    hideAllSections();
    showSection(page);
    setActiveNav(page);

    /* Call module's render */
    const cfg = PAGES[page];
    if (!cfg || !cfg.mod) return;

    try {
        if (typeof cfg.mod.render === 'function') {
            cfg.mod.render(params);
        } else if (typeof cfg.mod.init === 'function') {
            cfg.mod.init(params);
        }
    } catch (err) {
        console.error('Section render error for', page, err);
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
}

function onHashChange() {
    const { page, params } = getHashRoute();
    renderRoute(page, params);
}

window.addEventListener('hashchange', onHashChange);

/* Expose for modules */
window.navigateTo = (page, params = {}) => navigate(page, params);
window.getLastFeedbackId = () => __lastViewedFeedbackId;

/* ============================================================
   NAV CLICKS
   ============================================================ */
navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
        const page = link.dataset.page;
        if (!page) return;
        e.preventDefault();
        closeDrawer();
        navigate(page);
    });
});

/* External links (audit.html) — let browser handle */

/* ============================================================
   DRAWER
   ============================================================ */
function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('is-open');
    if (drawerBackdrop) drawerBackdrop.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}
function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    if (drawerBackdrop) drawerBackdrop.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}
if (menuBtn) menuBtn.addEventListener('click', () => {
    drawer && drawer.classList.contains('is-open') ? closeDrawer() : openDrawer();
});
if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) closeDrawer();
});

if (drawerAddReel) {
    drawerAddReel.addEventListener('click', () => {
        closeDrawer();
        setTimeout(() => {
            if (Reels && typeof Reels.openAddReelModal === 'function') {
                Reels.openAddReelModal();
            }
        }, 220);
    });
}

/* ============================================================
   LOGOUT MODAL
   ============================================================ */
function openLogoutModal() {
    if (!logoutModal) return;
    logoutModal.hidden = false;
    document.body.style.overflow = 'hidden';
}
function closeLogoutModal() {
    if (!logoutModal) return;
    logoutModal.hidden = true;
    document.body.style.overflow = '';
}
async function performLogout() {
    closeLogoutModal();
    try {
        await signOut(auth);
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
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
   LOGIN FORM
   ============================================================ */
if (loginForm) {
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
}

/* ============================================================
   FORGOT FORM
   ============================================================ */
if (forgotLink) {
    forgotLink.addEventListener('click', () => {
        forgotEmail.value = loginEmail.value.trim();
        forgotError.textContent = '';
        forgotSuccess.textContent = '';
        showForgot();
    });
}
if (forgotBack) forgotBack.addEventListener('click', showLogin);

if (forgotForm) {
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
}

/* ============================================================
   AUTH
   ============================================================ */
onAuthStateChanged(auth, (user) => {
    if (!user) {
        showLogin();
        hideLoaderNow();
        __currentPage = null;
        return;
    }
    if (user.uid !== ADMIN_UID) {
        signOut(auth);
        showLogin();
        loginError.textContent = 'This account is not authorized to access the admin panel.';
        hideLoaderNow();
        return;
    }
    if (drawerUserEmail) drawerUserEmail.textContent = user.email || 'Administrator';
    showDash();

    /* Init modules that need auth (firebase listeners) */
    try { if (Executive.init) Executive.init(); } catch (e) { console.error(e); }
    try { if (Reels.init) Reels.init(); } catch (e) { console.error(e); }
    try { if (Feedback.init) Feedback.init(); } catch (e) { console.error(e); }
    try { if (ReelAnalysis.init) ReelAnalysis.init(); } catch (e) { console.error(e); }
    try { if (Notifications.init) Notifications.init(); } catch (e) { console.error(e); }

    /* Route to current hash or default */
    onHashChange();

    /* Loader hides only after first section rendered */
    setTimeout(markReady, 150);
});

/* Expose markReady for modules to call after first data fire */
window.markReady = markReady;
