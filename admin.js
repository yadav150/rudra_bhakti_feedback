/* ============================================================
   RUDRA BHAKTI — ADMIN PANEL
   Phase 1C — restructured dashboard, zero-state, no demo data
   Phase 2 — swap placeholders with Firebase
   ============================================================ */

(function () {
    'use strict';

    /* ============================================================
       SERVICE PLACEHOLDERS — Phase 2 will connect Firebase here
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

    /* Phase 2: replace with Firebase read of feedback collection */
    async function loadFeedback() {
        try {
            const local = JSON.parse(localStorage.getItem('rrb_feedback') || '[]');
            return local.map((f) => ({
                ...f,
                isAnonymous: !f.name || f.name === 'Anonymous'
            }));
        } catch (e) {
            return [];
        }
    }

    /* Phase 2: replace with Firebase read of reels collection */
    async function loadReels() {
        try {
            return JSON.parse(localStorage.getItem('rrb_reels') || '[]');
        } catch (e) {
            return [];
        }
    }

    /* ============================================================
       STATS + ANALYTICS ENGINE (pure functions, no fake data)
       ============================================================ */
    function calculateStats(list) {
        const total = list.length;
        if (!total) {
            return { total: 0, avg: 0, five: 0, today: 0 };
        }
        const rated = list.filter((f) => f.rating != null);
        const avg = rated.length
            ? rated.reduce((s, f) => s + (Number(f.rating) || 0), 0) / rated.length
            : 0;
        const five = list.filter((f) => Number(f.rating) === 5).length;

        const today = new Date();
        const isToday = (iso) => {
            if (!iso) return false;
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
       REEL MANAGEMENT — service placeholders
       ============================================================ */
    const REELS_KEY = 'rrb_reels';

    function getSavedReels() {
        try { return JSON.parse(localStorage.getItem(REELS_KEY) || '[]'); }
        catch (e) { return []; }
    }
    function setSavedReels(list) {
        try { localStorage.setItem(REELS_KEY, JSON.stringify(list)); } catch (e) {}
    }
    function generateReelId() {
        const reels = getSavedReels();
        const nums = reels
            .map((r) => Number((r.id.match(/^RB(\d+)$/) || [])[1] || 0))
            .filter((n) => n > 0);
        const next = nums.length ? Math.max(...nums) + 1 : 1;
        return 'RB' + String(next).padStart(3, '0');
    }
    function makeThumbnail(seed) {
        const hue = (seed * 47) % 360;
        const hue2 = (hue + 40) % 360;
        const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice">' +
                '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
                    '<stop offset="0%" stop-color="hsl(' + hue + ',30%,75%)"/>' +
                    '<stop offset="100%" stop-color="hsl(' + hue2 + ',35%,45%)"/>' +
                '</linearGradient></defs>' +
                '<rect width="100" height="120" fill="url(#g)"/>' +
                '<circle cx="50" cy="60" r="18" fill="rgba(255,255,255,0.35)"/>' +
                '<path d="M44 52 L62 60 L44 68 Z" fill="white"/>' +
            '</svg>';
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }
    function mockTitleFromUrl(url) {
        const titles = [
            'Shiva & Parvati — Eternal Love',
            'Mahadev — The Silent Observer',
            'Ganga Aarti — Evening Prayer',
            'Rudra — The Storm Within',
            'Kailash — Home of the Divine',
            'Bholenath — The Innocent One',
            'Trishul — Power and Peace',
            'Damru — The Cosmic Rhythm'
        ];
        const seed = url.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        return titles[seed % titles.length];
    }

    /* Phase 2: replace with Facebook metadata fetch */
    async function fetchReelMetadata(url) {
        await new Promise((r) => setTimeout(r, 1200));
        if (!url || !/facebook\.com|fb\.com/i.test(url)) {
            return { ok: false, error: 'Please enter a valid Facebook Reel URL.' };
        }
        const seed = url.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        return {
            ok: true,
            data: {
                url,
                title: mockTitleFromUrl(url),
                thumbnail: makeThumbnail(seed)
            }
        };
    }

    /* Phase 2: replace with Firebase write to reels collection */
    async function saveReel(reel) {
        await new Promise((r) => setTimeout(r, 300));
        const list = getSavedReels();
        if (list.some((r) => r.id === reel.id)) {
            return { ok: false, error: 'A reel with this ID already exists.' };
        }
        list.push(reel);
        setSavedReels(list);
        return { ok: true, reel };
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

    /* Stats */
    const statTotal = document.getElementById('statTotal');
    const statAvg = document.getElementById('statAvg');
    const statFive = document.getElementById('statFive');
    const statToday = document.getElementById('statToday');

    /* Feedback list */
    const searchInput = document.getElementById('searchInput');
    const filterRating = document.getElementById('filterRating');
    const filterDate = document.getElementById('filterDate');
    const sortBy = document.getElementById('sortBy');
    const resultCount = document.getElementById('resultCount');
    const feedbackList = document.getElementById('feedbackList');

    /* Reels */
    const reelsEmpty = document.getElementById('reelsEmpty');
    const reelsList = document.getElementById('reelsList');

    /* Add Reel modal */
    const openAddReel = document.getElementById('openAddReel');
    const drawerAddReel = document.getElementById('drawerAddReel');
    const emptyAddReel = document.getElementById('emptyAddReel');
    const addReelModal = document.getElementById('addReelModal');
    const addReelBackdrop = document.getElementById('addReelBackdrop');
    const closeAddReel = document.getElementById('closeAddReel');
    const reelUrl = document.getElementById('reelUrl');
    const reelUrlError = document.getElementById('reelUrlError');
    const fetchReel = document.getElementById('fetchReel');
    const fetchLabel = document.getElementById('fetchLabel');
    const reelPreview = document.getElementById('reelPreview');

    /* Mobile drawer */
    const menuBtn = document.getElementById('menuBtn');
    const drawer = document.getElementById('drawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const drawerClose = document.getElementById('drawerClose');
    const drawerLogout = document.getElementById('drawerLogout');
    const drawerLinks = document.querySelectorAll('.drawer-link[data-drawer]');
    const navLinks = document.querySelectorAll('.dash-nav-link[data-nav]');

    /* State */
    let allFeedback = [];
    let savedReels = [];
    let pendingReel = null;

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

        showDash();
        await refreshAll();
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
    async function handleLogout() {
        await logoutAdmin();
        loginEmail.value = '';
        loginPassword.value = '';
        closeDrawer();
        showLogin();
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (drawerLogout) drawerLogout.addEventListener('click', handleLogout);

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
        const isOpen = drawer.classList.contains('is-open');
        isOpen ? closeDrawer() : openDrawer();
    });
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
            closeDrawer();
        }
    });

    /* Drawer nav links — close on select */
    drawerLinks.forEach((link) => {
        link.addEventListener('click', () => {
            drawerLinks.forEach((l) => l.classList.remove('is-active'));
            link.classList.add('is-active');
            closeDrawer();
        });
    });

    /* Desktop nav links — scroll spy targets */
    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            navLinks.forEach((l) => l.classList.remove('is-active'));
            link.classList.add('is-active');
        });
    });

    /* Scroll spy */
    window.addEventListener('scroll', () => {
        if (dash.hidden) return;
        const sections = document.querySelectorAll('.dash-section');
        let current = null;
        sections.forEach((sec) => {
            const rect = sec.getBoundingClientRect();
            if (rect.top <= 120 && rect.bottom > 120) {
                current = sec.id;
            }
        });
        if (current) {
            navLinks.forEach((l) => {
                l.classList.toggle('is-active', l.getAttribute('href') === '#' + current);
            });
            drawerLinks.forEach((l) => {
                l.classList.toggle('is-active', l.getAttribute('href') === '#' + current);
            });
        }
    }, { passive: true });

    /* ============================================================
       REFRESH ALL
       ============================================================ */
    async function refreshAll() {
        allFeedback = await loadFeedback();
        savedReels = await loadReels();
        renderStats();
        renderReels();
        renderList();
    }

    /* ============================================================
       STATS
       ============================================================ */
    function renderStats() {
        const s = calculateStats(allFeedback);
        statTotal.textContent = s.total;
        statAvg.textContent = s.avg.toFixed(1);
        statFive.textContent = s.five;
        statToday.textContent = s.today;
    }

    /* ============================================================
       REELS
       ============================================================ */
    function renderReels() {
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
            return `
                <div class="reel-row" data-id="${escapeHTML(r.id)}">
                    <div class="reel-row-thumb">
                        ${r.thumbnail
                            ? '<img src="' + r.thumbnail + '" alt="" />'
                            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v14l11-7z"/></svg>'}
                    </div>
                    <div class="reel-row-main">
                        <div class="reel-row-top">
                            <span class="reel-row-id">${escapeHTML(r.id)}</span>
                            <span class="reel-row-title">${escapeHTML(r.title)}</span>
                        </div>
                        <div class="reel-row-url">${escapeHTML(r.url)}</div>
                    </div>
                    <div class="reel-row-actions">
                        <a class="reel-row-link" href="${escapeHTML(link)}" target="_blank" rel="noopener">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                            </svg>
                            Open
                        </a>
                        <button type="button" class="reel-row-link reel-row-copy" data-copy="${escapeHTML(link)}">
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
            setTimeout(() => {
                btn.classList.remove('is-copied');
                btn.innerHTML = original;
            }, 1800);
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

    function renderList() {
        const list = getFiltered();
        resultCount.textContent = list.length + ' result' + (list.length === 1 ? '' : 's');

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
        reelPreview.hidden = true;
        reelPreview.innerHTML = '';
        pendingReel = null;
        document.querySelector('.modal-card').classList.remove('is-processing');
        setTimeout(() => reelUrl.focus(), 80);
    }

    function closeReelModal() {
        addReelModal.hidden = true;
        document.body.style.overflow = '';
        reelUrl.value = '';
        reelUrlError.textContent = '';
        reelPreview.hidden = true;
        reelPreview.innerHTML = '';
        pendingReel = null;
        document.querySelector('.modal-card').classList.remove('is-processing');
    }

    async function handleFetchReel() {
        const url = reelUrl.value.trim();
        reelUrlError.textContent = '';

        if (!url) {
            reelUrlError.textContent = 'Please enter a Facebook Reel URL.';
            return;
        }

        const card = document.querySelector('.modal-card');
        card.classList.add('is-processing');
        fetchReel.classList.add('is-loading');
        fetchReel.disabled = true;
        fetchLabel.textContent = 'Fetching…';
        reelPreview.hidden = true;

        try {
            const res = await fetchReelMetadata(url);

            if (!res.ok) {
                reelUrlError.textContent = res.error || 'Unable to fetch reel details.';
                return;
            }

            pendingReel = {
                id: generateReelId(),
                url: res.data.url,
                title: res.data.title,
                thumbnail: res.data.thumbnail,
                createdAt: new Date().toISOString()
            };

            renderPreview(pendingReel);
        } catch (err) {
            console.error('Fetch error:', err);
            reelUrlError.textContent = 'Something went wrong. Please try again.';
        } finally {
            card.classList.remove('is-processing');
            fetchReel.classList.remove('is-loading');
            fetchReel.disabled = false;
            fetchLabel.textContent = 'Fetch Details';
        }
    }

    function renderPreview(reel) {
        reelPreview.innerHTML = `
            <div class="reel-preview-card">
                <div class="reel-preview-thumb">
                    ${reel.thumbnail
                        ? '<img src="' + reel.thumbnail + '" alt="" />'
                        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v14l11-7z"/></svg>'}
                </div>
                <div class="reel-preview-info">
                    <span class="reel-preview-label">Detected Reel</span>
                    <h3 class="reel-preview-title">${escapeHTML(reel.title)}</h3>
                    <span class="reel-preview-id">${escapeHTML(reel.id)}</span>
                </div>
            </div>
            <div class="reel-preview-actions">
                <button type="button" class="btn btn-primary" id="saveReelBtn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
        const saveBtn = document.getElementById('saveReelBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = 'Saving…';
        }

        const res = await saveReel(pendingReel);

        if (!res.ok) {
            reelUrlError.textContent = res.error || 'Unable to save reel.';
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Save Reel';
            }
            return;
        }

        savedReels = await loadReels();
        renderReels();
        closeReelModal();
    }

    /* Bind all Add Reel triggers */
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
            if (e.key === 'Enter') {
                e.preventDefault();
                handleFetchReel();
            }
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && addReelModal && !addReelModal.hidden) {
            closeReelModal();
        }
    });

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

    /* ===== INIT ===== */
    renderReels();
    renderList();
    showLogin();
})();
