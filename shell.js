/* ============================================================
   RUDRA BHAKTI — SHARED SHELL
   Loader + Auth guard + Drawer + Logout modal
   ============================================================ */

import { auth, ADMIN_UID } from './firebase.js';
import { onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

let __loaderDone = false;
let __opts = {};

/* ============================================================
   LOADER
   ============================================================ */
export function markReady() {
    if (__loaderDone) return;
    __loaderDone = true;
    const loader = document.getElementById('pageLoader');
    if (!loader) return;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => loader.classList.add('is-hidden'));
    });
}

export function hideLoaderNow() {
    __loaderDone = true;
    const loader = document.getElementById('pageLoader');
    if (loader) loader.classList.add('is-hidden');
}

/* ============================================================
   SCREEN SWITCH
   ============================================================ */
export function showLoginScreen() {
    const lw = document.getElementById('loginWrap');
    const fw = document.getElementById('forgotWrap');
    const d = document.getElementById('dash');
    if (lw) lw.hidden = false;
    if (fw) fw.hidden = true;
    if (d) d.hidden = true;
}

export function showForgotScreen() {
    const lw = document.getElementById('loginWrap');
    const fw = document.getElementById('forgotWrap');
    const d = document.getElementById('dash');
    if (lw) lw.hidden = true;
    if (fw) fw.hidden = false;
    if (d) d.hidden = true;
}

export function showDashScreen() {
    const lw = document.getElementById('loginWrap');
    const fw = document.getElementById('forgotWrap');
    const d = document.getElementById('dash');
    if (lw) lw.hidden = true;
    if (fw) fw.hidden = true;
    if (d) d.hidden = false;
}

/* ============================================================
   DRAWER
   ============================================================ */
let __closeDrawer = null;

export function closeDrawer() {
    if (__closeDrawer) __closeDrawer();
}

function bindDrawer() {
    const menuBtn = document.getElementById('menuBtn');
    const drawer = document.getElementById('drawer');
    const backdrop = document.getElementById('drawerBackdrop');
    const closeBtn = document.getElementById('drawerClose');
    if (!menuBtn || !drawer) return;

    const open = () => {
        drawer.classList.add('is-open');
        if (backdrop) backdrop.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        menuBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    };
    const close = () => {
        drawer.classList.remove('is-open');
        if (backdrop) backdrop.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };
    __closeDrawer = close;

    menuBtn.addEventListener('click', () => {
        drawer.classList.contains('is-open') ? close() : open();
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (backdrop) backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });
}

/* ============================================================
   LOGOUT MODAL
   ============================================================ */
export function openLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
}

export function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
}

async function performLogout() {
    closeLogoutModal();
    try {
        await signOut(auth);
        if (__opts.mode === 'admin') {
            const le = document.getElementById('loginEmail');
            const lp = document.getElementById('loginPassword');
            if (le) le.value = '';
            if (lp) lp.value = '';
        }
        closeDrawer();
    } catch (err) {
        console.error('Logout error:', err);
    }
}

function bindLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (!modal) return;
    const backdrop = document.getElementById('logoutBackdrop');
    const cancel = document.getElementById('logoutCancel');
    const confirm = document.getElementById('logoutConfirm');
    const lb = document.getElementById('logoutBtn');
    const dl = document.getElementById('drawerLogout');

    if (cancel) cancel.addEventListener('click', closeLogoutModal);
    if (backdrop) backdrop.addEventListener('click', closeLogoutModal);
    if (confirm) confirm.addEventListener('click', performLogout);
    if (lb) lb.addEventListener('click', openLogoutModal);
    if (dl) dl.addEventListener('click', () => {
        closeDrawer();
        setTimeout(openLogoutModal, 220);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) closeLogoutModal();
    });
}

/* ============================================================
   FORGOT LINK TOGGLE (admin mode only)
   ============================================================ */
function bindForgotToggle() {
    const fl = document.getElementById('forgotLink');
    const fb = document.getElementById('forgotBack');
    if (fl) fl.addEventListener('click', () => {
        const le = document.getElementById('loginEmail');
        const fe = document.getElementById('forgotEmail');
        if (fe && le) fe.value = le.value.trim();
        const feErr = document.getElementById('forgotError');
        const feSuc = document.getElementById('forgotSuccess');
        if (feErr) feErr.textContent = '';
        if (feSuc) feSuc.textContent = '';
        showForgotScreen();
    });
    if (fb) fb.addEventListener('click', showLoginScreen);
}

/* ============================================================
   INIT SHELL
   ============================================================ */
export function initShell(opts = {}) {
    __opts = opts;
    const mode = opts.mode || 'page';

    /* Safety net */
    setTimeout(markReady, 2000);

    /* Bind UI */
    bindDrawer();
    bindLogoutModal();
    if (mode === 'admin') bindForgotToggle();

    /* Auth check */
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            if (mode === 'admin') {
                showLoginScreen();
                hideLoaderNow();
            } else {
                hideLoaderNow();
                window.location.replace('admin.html');
            }
            return;
        }
        if (user.uid !== ADMIN_UID) {
            signOut(auth);
            if (mode === 'admin') {
                showLoginScreen();
                const le = document.getElementById('loginError');
                if (le) le.textContent = 'This account is not authorized to access the admin panel.';
                hideLoaderNow();
            } else {
                hideLoaderNow();
                window.location.replace('admin.html');
            }
            return;
        }
        /* Authorized */
        const de = document.getElementById('drawerUserEmail');
        if (de) de.textContent = user.email || 'Administrator';
        if (mode === 'admin') showDashScreen();
        else {
            const d = document.getElementById('dash');
            if (d) d.hidden = false;
        }
        if (opts.onAuthed) opts.onAuthed(user);
    });
}
