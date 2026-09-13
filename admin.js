/* ============================================================
   RUDRA BHAKTI — ADMIN PANEL
   Phase 1 : static demo + service placeholders
   Phase 2 : swap placeholders with Firebase
   ============================================================ */

(function () {
    'use strict';

    /* ============================================================
       DEMO DATA (Phase 1 only)
       ============================================================ */
    const DEMO_DATA = [
        {
            id: 'f_001',
            feeling: 'Peaceful',
            wouldWatchMore: 'Definitely — I love this type of content',
            connectedWith: 'The Shiva & Parvati emotion',
            rating: 5,
            message: 'This Reel brought such a serene energy. Please keep creating more content like this.',
            isAnonymous: false,
            name: 'Aarav Sharma',
            email: 'aarav.sharma@example.com',
            submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'f_002',
            feeling: 'Devotional',
            wouldWatchMore: 'Yes, sometimes',
            connectedWith: 'The devotional feeling',
            rating: 4,
            message: '',
            isAnonymous: true,
            name: 'Anonymous',
            email: 'anonymous@gmail.com',
            submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'f_003',
            feeling: 'Emotional',
            wouldWatchMore: 'Definitely — I love this type of content',
            connectedWith: 'Everything together',
            rating: 5,
            message: 'Beautifully presented. The visuals and the background music worked together wonderfully.',
            isAnonymous: false,
            name: 'Priya Nair',
            email: 'priya.nair@example.com',
            submittedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'f_004',
            feeling: 'Calm',
            wouldWatchMore: "I'm not sure",
            connectedWith: 'The music',
            rating: 3,
            message: 'Decent content. Could be a little shorter.',
            isAnonymous: false,
            name: 'Rohit Verma',
            email: 'rohit.v@example.com',
            submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'f_005',
            feeling: 'Inspired',
            wouldWatchMore: 'Definitely — I love this type of content',
            connectedWith: 'The Shiva & Parvati emotion',
            rating: 5,
            message: 'I want to learn more about this. Please share more details in future Reels.',
            isAnonymous: true,
            name: 'Anonymous',
            email: 'anonymous@gmail.com',
            submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'f_006',
            feeling: 'Peaceful',
            wouldWatchMore: 'Yes, sometimes',
            connectedWith: 'The artwork / visuals',
            rating: 4,
            message: '',
            isAnonymous: false,
            name: 'Meera Iyer',
            email: 'meera.iyer@example.com',
            submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];

    /* ============================================================
       SERVICE PLACEHOLDERS — Phase 2 hooks
       ============================================================ */
    async function loginAdmin(email, password) {
        await new Promise((r) => setTimeout(r, 500));
        if (!email || !password) return { ok: false, error: 'Please enter email and password.' };
        return { ok: true, user: { email } };
    }

    async function logoutAdmin() {
        await new Promise((r) => setTimeout(r, 200));
        return { ok: true };
    }

    async function loadFeedback() {
        const local = JSON.parse(localStorage.getItem('rrb_feedback') || '[]');
        const normalized = local.map((f) => ({
            ...f,
            isAnonymous: !f.name || f.name === 'Anonymous'
        }));
        return [...normalized, ...DEMO_DATA];
    }

    function calculateStats(list) {
        const total = list.length;
        const avg = total ? list.reduce((s, f) => s + (Number(f.rating) || 0), 0) / total : 0;
        const five = list.filter((f) => Number(f.rating) === 5).length;
        const today = new Date();
        const isToday = (iso) => {
            const d = new Date(iso);
            return d.getFullYear() === today.getFullYear()
                && d.getMonth() === today.getMonth()
                && d.getDate() === today.getDate();
        };
        return {
            total,
            avg: Math.round(avg * 10) / 10,
            five,
            today: list.filter((f) => isToday(f.submittedAt)).length
        };
    }

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
    const dashUserEmail = document.getElementById('dashUserEmail');

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

    let allFeedback = [];

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

        const res = await loginAdmin(email, password);

        loginLabel.textContent = 'Sign In';
        submitBtn.disabled = false;

        if (!res.ok) {
            loginError.textContent = res.error || 'Unable to sign in.';
            return;
        }

        dashUserEmail.textContent = res.user.email;
        showDash();
        await refreshData();
    });

    /* ============================================================
       FORGOT
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

        await new Promise((r) => setTimeout(r, 700));

        forgotLabel.textContent = 'Send Reset Link';
        submitBtn.disabled = false;

        forgotSuccess.textContent = 'If that email is registered, a reset link has been sent.';
    });

    /* ============================================================
       LOGOUT
       ============================================================ */
    logoutBtn.addEventListener('click', async () => {
        await logoutAdmin();
        loginEmail.value = '';
        loginPassword.value = '';
        showLogin();
    });

    /* ============================================================
       DATA
       ============================================================ */
    async function refreshData() {
        allFeedback = await loadFeedback();
        renderStats();
        renderList();
    }

    function renderStats() {
        const s = calculateStats(allFeedback);
        statTotal.textContent = s.total;
        statAvg.textContent = s.avg.toFixed(1);
        statFive.textContent = s.five;
        statToday.textContent = s.today;
    }

    /* ============================================================
       FILTER + SORT
       ============================================================ */
    function getFiltered() {
        let list = [...allFeedback];

        const q = searchInput.value.trim().toLowerCase();
        if (q) {
            list = list.filter((f) =>
                (f.name || '').toLowerCase().includes(q) ||
                (f.email || '').toLowerCase().includes(q) ||
                (f.message || '').toLowerCase().includes(q)
            );
        }

        const r = filterRating.value;
        if (r === '4plus') list = list.filter((f) => Number(f.rating) >= 4);
        else if (r !== 'all') list = list.filter((f) => Number(f.rating) === Number(r));

        const d = filterDate.value;
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

        const s = sortBy.value;
        list.sort((a, b) => {
            if (s === 'newest') return new Date(b.submittedAt) - new Date(a.submittedAt);
            if (s === 'oldest') return new Date(a.submittedAt) - new Date(b.submittedAt);
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
        const list = getFiltered();
        resultCount.textContent = `${list.length} result${list.length === 1 ? '' : 's'}`;

        if (!list.length) {
            feedbackList.innerHTML = `
                <div class="empty">
                    <div class="empty-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                    </div>
                    <h3>No feedback found</h3>
                    <p>Try adjusting your search or filters.</p>
                </div>
            `;
            return;
        }

        feedbackList.innerHTML = list.map(renderRow).join('');
    }

    function renderRow(f) {
        const anon = f.isAnonymous || f.name === 'Anonymous';
        const safe = (v) => escapeHTML(v == null ? '' : String(v));
        const dateStr = formatDate(f.submittedAt);

        return `
            <article class="row">
                <div class="row-top">
                    <span class="row-name">${safe(f.name || 'Anonymous')}</span>
                    ${!anon ? `<span class="row-email">${safe(f.email)}</span>` : `<span class="row-anon">Anonymous</span>`}
                    <span class="row-rating">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1z"/>
                        </svg>
                        ${safe(f.rating)} / 5
                    </span>
                </div>

                <div class="row-grid">
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
       HELPERS
       ============================================================ */
    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ============================================================
       BINDINGS
       ============================================================ */
    [searchInput, filterRating, filterDate, sortBy].forEach((el) => {
        if (!el) return;
        el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', renderList);
    });

    showLogin();
})();
