/* ============================================================
   RUDRA BHAKTI — REELS SECTION
   ============================================================ */
import { db } from './firebase.js';
import { ref, onValue, set, runTransaction } from "firebase/database";

const $ = (id) => document.getElementById(id);

const REELS_PER_PAGE = 5;
const REEL_INTEL_PER_PAGE = 5;

let allFeedback = [];
let savedReels = [];
let pendingReel = null;
let selectedCompare = new Set();
let unsubReels = null;
let unsubFeedback = null;
let reelsPage = 1;
let reelIntelPage = 1;
let started = false;

/* ============================================================
   INIT
   ============================================================ */
export function init() {
    if (started) return;
    started = true;

    bindModal();
    bindFilters();

    unsubReels = onValue(ref(db, 'reels'), (snap) => {
        savedReels = [];
        snap.forEach((child) => {
            savedReels.push({ id: child.key, ...child.val() });
        });
        savedReels.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
        render();
        window.markReady && window.markReady();
    }, (err) => {
        console.error('Reels listener error:', err);
        window.markReady && window.markReady();
    });

    unsubFeedback = onValue(ref(db, 'feedback'), (snap) => {
        allFeedback = [];
        snap.forEach((child) => {
            allFeedback.push({ id: child.key, ...child.val() });
        });
        render();
        window.markReady && window.markReady();
    }, (err) => {
        console.error('Feedback listener error:', err);
        window.markReady && window.markReady();
    });
}

export function render() {
    renderReels();
    renderReelIntelligence();
    renderReelComparison();
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHTML(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(v) {
    return String(v == null ? '' : v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
   REELS LIST
   ============================================================ */
function renderReels() {
    const reelsEmpty = document.getElementById('reelsEmpty');
    const reelsList = document.getElementById('reelsList');
    if (!reelsEmpty || !reelsList) return;

    if (!savedReels.length) {
        reelsEmpty.hidden = false;
        reelsList.hidden = true;
        reelsList.innerHTML = '';
        const pg = document.getElementById('reelsPagination');
        if (pg) pg.hidden = true;
        return;
    }
    reelsEmpty.hidden = true;
    reelsList.hidden = false;

    const totalPages = Math.max(1, Math.ceil(savedReels.length / REELS_PER_PAGE));
    if (reelsPage > totalPages) reelsPage = totalPages;
    if (reelsPage < 1) reelsPage = 1;

    const start = (reelsPage - 1) * REELS_PER_PAGE;
    const pageItems = savedReels.slice(start, start + REELS_PER_PAGE);

    reelsList.innerHTML = pageItems.map((r) => {
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

    renderPagination('reelsPagination', reelsPage, totalPages, (p) => {
        reelsPage = p;
        renderReels();
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

    const wants = {};
    items.forEach((f) => {
        const k = (f.wantMore || '').trim();
        if (k) wants[k] = (wants[k] || 0) + 1;
    });
    const topWant = Object.entries(wants).sort((a, b) => b[1] - a[1])[0];

    return { total, avg, recommend, repeat, topFeeling, topWant };
}

function labelForReel(stats) {
    if (!stats) return { text: 'Insufficient Data', cls: 'insufficient' };
    if (stats.total < 3) return { text: 'Insufficient Data', cls: 'insufficient' };
    if (stats.avg >= 4.5 && stats.recommend >= 70) return { text: 'High Performer', cls: 'high' };
    if (stats.avg >= 4 && stats.recommend >= 50) return { text: 'Strong Potential', cls: 'strong' };
    if (stats.avg >= 3.5) return { text: 'Stable', cls: 'stable' };
    return { text: 'Needs Attention', cls: 'attention' };
}

/* ============================================================
   REEL INTELLIGENCE
   ============================================================ */
function renderReelIntelligence() {
    const reelIntelEmpty = document.getElementById('reelIntelEmpty');
    const reelIntelList = document.getElementById('reelIntelList');
    if (!reelIntelEmpty || !reelIntelList) return;

    if (!savedReels.length || !allFeedback.length) {
        reelIntelEmpty.hidden = false;
        reelIntelList.hidden = true;
        reelIntelList.innerHTML = '';
        const pg = document.getElementById('reelIntelPagination');
        if (pg) pg.hidden = true;
        return;
    }
    reelIntelEmpty.hidden = true;
    reelIntelList.hidden = false;

    const totalPages = Math.max(1, Math.ceil(savedReels.length / REEL_INTEL_PER_PAGE));
    if (reelIntelPage > totalPages) reelIntelPage = totalPages;
    if (reelIntelPage < 1) reelIntelPage = 1;

    const start = (reelIntelPage - 1) * REEL_INTEL_PER_PAGE;
    const pageItems = savedReels.slice(start, start + REEL_INTEL_PER_PAGE);

    const rows = pageItems.map((r) => {
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
                    ${stats.topWant ? `<span><strong>Wants more of:</strong> ${escapeHTML(stats.topWant[0])} (${pct(stats.topWant[1], stats.total)}%)</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    reelIntelList.innerHTML = rows;

    renderPagination('reelIntelPagination', reelIntelPage, totalPages, (p) => {
        reelIntelPage = p;
        renderReelIntelligence();
    });
}

/* ============================================================
   REEL COMPARISON
   ============================================================ */
function renderReelComparison() {
    const compareSelect = document.getElementById('compareSelect');
    const compareResult = document.getElementById('compareResult');
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
        { label: 'Wants More Of', get: (s) => s && s.topWant ? s.topWant[0] : '—' }
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
   ADD REEL MODAL
   ============================================================ */
export function openAddReelModal() {
    const modal = document.getElementById('addReelModal');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    resetModal();
    setTimeout(() => {
        const url = document.getElementById('reelUrl');
        if (url) url.focus();
    }, 80);
}

function closeAddReelModal() {
    const modal = document.getElementById('addReelModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    resetModal();
}

function resetModal() {
    const url = document.getElementById('reelUrl');
    const err = document.getElementById('reelUrlError');
    const manual = document.getElementById('reelManual');
    const t = document.getElementById('reelTitleInput');
    const th = document.getElementById('reelThumbInput');
    const prev = document.getElementById('reelPreview');
    const card = document.querySelector('#addReelModal .modal-card');
    if (url) url.value = '';
    if (err) err.textContent = '';
    if (manual) manual.hidden = true;
    if (t) t.value = '';
    if (th) th.value = '';
    if (prev) { prev.hidden = true; prev.innerHTML = ''; }
    if (card) card.classList.remove('is-processing');
    pendingReel = null;
}

function bindModal() {
    const openers = ['emptyAddReel'];
    openers.forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', openAddReelModal);
    });

    const close = document.getElementById('closeAddReel');
    const backdrop = document.getElementById('addReelBackdrop');
    const fetch = document.getElementById('fetchReel');
    const url = document.getElementById('reelUrl');
    const title = document.getElementById('reelTitleInput');
    const thumb = document.getElementById('reelThumbInput');

    if (close) close.addEventListener('click', closeAddReelModal);
    if (backdrop) backdrop.addEventListener('click', closeAddReelModal);
    if (fetch) fetch.addEventListener('click', handleFetchReel);
    if (url) {
        url.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleFetchReel(); }
        });
    }
    if (title) title.addEventListener('input', () => buildPreviewFromManual(url ? url.value.trim() : ''));
    if (thumb) thumb.addEventListener('input', () => buildPreviewFromManual(url ? url.value.trim() : ''));
    document.addEventListener('keydown', (e) => {
        const m = document.getElementById('addReelModal');
        if (e.key === 'Escape' && m && !m.hidden) closeAddReelModal();
    });
}

function bindFilters() {
    /* No filters on reels page — kept for future */
}

async function handleFetchReel() {
    const urlEl = document.getElementById('reelUrl');
    const errEl = document.getElementById('reelUrlError');
    const manual = document.getElementById('reelManual');
    const fetchBtn = document.getElementById('fetchReel');
    const fetchLabel = document.getElementById('fetchLabel');
    const titleEl = document.getElementById('reelTitleInput');
    const thumbEl = document.getElementById('reelThumbInput');
    const card = document.querySelector('#addReelModal .modal-card');
    if (!urlEl) return;

    const url = urlEl.value.trim();
    if (errEl) errEl.textContent = '';
    if (manual) manual.hidden = true;

    const preview = document.getElementById('reelPreview');
    if (preview) preview.hidden = true;

    if (!url) {
        if (errEl) errEl.textContent = 'Please enter a Facebook Reel URL.';
        return;
    }
    if (!/^https?:\/\//i.test(url)) {
        if (errEl) errEl.textContent = 'Please enter a valid URL starting with http:// or https://';
        return;
    }

    if (card) card.classList.add('is-processing');
    if (fetchBtn) { fetchBtn.classList.add('is-loading'); fetchBtn.disabled = true; }
    if (fetchLabel) fetchLabel.textContent = 'Fetching…';

    try {
        const api = 'https://api.microlink.io/?meta=true&url=' + encodeURIComponent(url);
        const res = await fetch(api);
        const json = await res.json();

        if (json.status !== 'success' || !json.data) {
            if (errEl) errEl.textContent = 'Could not retrieve Reel metadata. Please enter details manually.';
            if (manual) manual.hidden = false;
            if (titleEl) titleEl.focus();
            return;
        }

        const d = json.data;
        let t = (d.title || '').trim();
        const author = (d.author || '').trim();
        const desc = (d.description || '').trim();
        if (t && author && t.toLowerCase() === author.toLowerCase()) t = desc || t;
        if (!t) t = desc || author;
        if (t.length > 180) t = t.slice(0, 177) + '...';

        const thumb = (d.image && d.image.url) ? d.image.url : '';
        const canonical = d.url || url;

        if (!t && !thumb) {
            if (errEl) errEl.textContent = 'No usable metadata found for this Reel. Please enter details manually.';
            if (manual) manual.hidden = false;
            if (titleEl) titleEl.focus();
            return;
        }

        if (titleEl) titleEl.value = t;
        if (thumbEl) thumbEl.value = thumb;
        pendingReel = { url: canonical, title: t, thumbnail: thumb };
        if (manual) manual.hidden = false;
        renderPreview(pendingReel);
    } catch (err) {
        console.error('Fetch error:', err);
        if (errEl) errEl.textContent = 'Network error while fetching. Please enter details manually.';
        if (manual) manual.hidden = false;
    } finally {
        if (card) card.classList.remove('is-processing');
        if (fetchBtn) { fetchBtn.classList.remove('is-loading'); fetchBtn.disabled = false; }
        if (fetchLabel) fetchLabel.textContent = 'Fetch Details';
    }
}

function buildPreviewFromManual(url) {
    const titleEl = document.getElementById('reelTitleInput');
    const thumbEl = document.getElementById('reelThumbInput');
    const preview = document.getElementById('reelPreview');
    if (!titleEl) return;
    const title = titleEl.value.trim();
    if (!title) { if (preview) preview.hidden = true; return; }
    pendingReel = { url, title, thumbnail: thumbEl ? thumbEl.value.trim() : '' };
    renderPreview(pendingReel);
}

function renderPreview(reel) {
    const preview = document.getElementById('reelPreview');
    if (!preview) return;
    preview.innerHTML = `
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
    preview.hidden = false;
    const saveBtn = document.getElementById('saveReelBtn');
    if (saveBtn) saveBtn.addEventListener('click', handleSaveReel);
}

async function handleSaveReel() {
    if (!pendingReel) return;
    const titleEl = document.getElementById('reelTitleInput');
    const thumbEl = document.getElementById('reelThumbInput');
    const errEl = document.getElementById('reelUrlError');
    const title = titleEl ? titleEl.value.trim() : '';
    if (!title) {
        if (errEl) errEl.textContent = 'Please enter a title for this reel.';
        return;
    }
    const saveBtn = document.getElementById('saveReelBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = 'Saving…'; }

    try {
        const reelId = await generateNextReelId();
        const record = {
            title,
            url: pendingReel.url,
            thumbnail: thumbEl ? (thumbEl.value.trim() || '') : '',
            createdAt: Date.now()
        };
                await set(ref(db, 'reels/' + reelId), record);
        try {
            const { auth: __auth } = await import('./firebase.js');
            const { ref: __ref, push: __push, set: __set } = await import("firebase/database");
            const entryRef = __push(__ref(db, 'auditLog'));
            await __set(entryRef, {
                ts: Date.now(),
                action: 'create',
                module: 'reels',
                target: reelId,
                before: '',
                after: (record.title || '').slice(0, 200),
                user: __auth.currentUser?.email || 'admin'
            });
        } catch (e) { /* silent */ }
        closeAddReelModal();
    } catch (err) {
        console.error('Save reel error:', err);
        if (errEl) errEl.textContent = 'Unable to save reel. Please try again.';
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
