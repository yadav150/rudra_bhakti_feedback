/* ============================================================
   RUDRA BHAKTI — ADMIN PANEL
   Executive dashboard + blue loader (zero CLS)
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail }
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

function showLoaderNow() {
    __loaderDone = false;
    const loader = document.getElementById('pageLoader');
    if (loader) loader.classList.remove('is-hidden');
}

/* Safety net — never keep user waiting more than 2s */
setTimeout(markReady, 2000);

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

/* ============================================================
   STATE
   ============================================================ */
let allFeedback = [];
let savedReels = [];
let unsubscribeReels = null;
let unsubscribeFeedback = null;
let firstDataFired = false;

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
        hideLoaderNow();
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
    showLoaderNow();

    try {
        await signInWithEmailAndPassword(auth, email, password);
        /* Loader stays visible — markReady() hides it after data loads */
    } catch (err) {
        console.error('Login error:', err);
        hideLoaderNow();
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
        renderExecutive();
        renderActionCenter();
    }, (err) => {
        console.error('Reels listener error:', err);
        maybeMarkReady();
    });

    unsubscribeFeedback = onValue(ref(db, 'feedback'), (snap) => {
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
        renderExecutive();
        renderActionCenter();
        maybeMarkReady();
    }, (err) => {
        console.error('Feedback listener error:', err);
        maybeMarkReady();
    });
}

function stopRealtimeListeners() {
    if (unsubscribeReels) { unsubscribeReels(); unsubscribeReels = null; }
    if (unsubscribeFeedback) { unsubscribeFeedback(); unsubscribeFeedback = null; }
}

/* Both listeners must fire at least once before we reveal the page */
function maybeMarkReady() {
    if (firstDataFired) return;
    if (unsubscribeReels && unsubscribeFeedback) {
        firstDataFired = true;
        markReady();
    }
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHTML(v) {
    return String(v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function pct(n, d) {
    if (!d) return 0;
    return Math.round((n / d) * 100);
}

/* ============================================================
   REEL STATS
   ============================================================ */
function computeReelStats(reelId) {
    const items = allFeedback.filter((f) => f.reelId === reelId);
    const total = items.length;
    if (!total) return null;

    const rated = items.filter((f) => f.rating != null);
    const avg = rated.length ? rated.reduce((s, f) => s + Number(f.rating || 0), 0) / rated.length : 0;

    const recYes = items.filter((f) => {
        const v = (f.more || f.wouldWatchMore || '').toLowerCase();
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

    return { total, avg, recommend, repeat, topFeeling };
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
        const v = (f.more || f.wouldWatchMore || '').toLowerCase();
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

        const highRatingLowRepeat = allFeedback.filter((f) => Number(f.rating) >= 4 && (f.engageAgain || '').toLowerCase().startsWith('unlikely')).length;
        if (highRatingLowRepeat >= 2) {
            actions.push({
                type: 'investigate',
                title: 'Investigate satisfaction-repeat gap',
                reason: highRatingLowRepeat + ' high-rated responses also indicated low repeat intent.',
                tags: ['Repeats: ' + highRatingLowRepeat]
            });
        }

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
   INITIAL
   ============================================================ */
showLogin();
