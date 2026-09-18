/* ============================================================
   RUDRA BHAKTI — AUDIT: DATA EXPLORER
   Search across reels + feedback. Full record inspection.
   ============================================================ */
import {
    escapeHTML, emptyBlock,
    paginate, renderPagination
} from './audit-charts.js';

let searchQuery = '';
let searchType = 'all';
let expReelsPage = 1;
let expFeedbackPage = 1;

export function init(state) {}

export function render(state) {
    window.__auditState = state;
    const el = document.getElementById('page-explorer');
    if (!el) return;

    if (!el.dataset.built) {
        el.dataset.built = '1';
        el.innerHTML = `
            <div class="section-head">
                <h2>Data Explorer</h2>
                <p>Search records by Reel ID, Response ID, or content.</p>
            </div>

            <div class="toolbar" style="margin-bottom:14px;">
                <select id="expType" class="select">
                    <option value="all">All</option>
                    <option value="reel">Reels</option>
                    <option value="feedback">Feedback</option>
                </select>
                <div class="search">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input type="search" id="expSearch" placeholder="Search ID, title, feeling…" autocomplete="off" />
                </div>
            </div>

            <div id="expResults"></div>
        `;

        const type = document.getElementById('expType');
        const input = document.getElementById('expSearch');

        type.value = searchType;
        input.value = searchQuery;

                type.addEventListener('change', () => {
            searchType = type.value;
            expReelsPage = 1;
            expFeedbackPage = 1;
            renderResults(window.__auditState);
        });

        input.addEventListener('input', () => {
            searchQuery = input.value.trim().toLowerCase();
            expReelsPage = 1;
            expFeedbackPage = 1;
            renderResults(window.__auditState);
        });
    }

    renderResults(state);
}

function renderResults(state) {
    const container = document.getElementById('expResults');
    if (!container) return;

    const reels = (state && state.reels) || [];
    const feedback = (state && state.feedback) || [];

    const q = searchQuery;

    /* Filter reels */
    const matchedReels = (searchType === 'all' || searchType === 'reel') ? reels.filter(r => {
        if (!q) return true;
        return r.id.toLowerCase().includes(q) || (r.title || '').toLowerCase().includes(q);
    }) : [];

    /* Filter feedback */
    const matchedFeedback = (searchType === 'all' || searchType === 'feedback') ? feedback.filter(f => {
        if (!q) return true;
        return (
            (f.id || '').toLowerCase().includes(q) ||
            (f.reelId || '').toLowerCase().includes(q) ||
            (f.reelTitle || '').toLowerCase().includes(q) ||
            (f.feeling || '').toLowerCase().includes(q) ||
            (f.name || '').toLowerCase().includes(q) ||
            (f.message || '').toLowerCase().includes(q)
        );
    }) : [];

    const pagedReels = paginate(matchedReels, expReelsPage, 5);
    const pagedFeedback = paginate(matchedFeedback, expFeedbackPage, 5);

    container.innerHTML = `
        <div class="stats" style="margin-bottom:14px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Reels matched</span>
                    <span class="stat-value">${matchedReels.length} / ${reels.length}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Feedback matched</span>
                    <span class="stat-value">${matchedFeedback.length} / ${feedback.length}</span>
                </div>
            </div>
        </div>

        ${matchedReels.length ? `
            <div class="panel-card" style="margin-bottom:14px;">
                <div class="panel-head"><span class="panel-title">Reels</span><span class="panel-meta">${matchedReels.length} record${matchedReels.length === 1 ? '' : 's'}</span></div>
                <div class="panel-body panel-body--flush">
                    ${pagedReels.items.map(r => {
                        const fbCount = feedback.filter(f => f.reelId === r.id).length;
                        return `
                            <div class="intel-row">
                                <div class="intel-head">
                                    <span class="intel-id">${escapeHTML(r.id)}</span>
                                    <span class="intel-title">${escapeHTML((r.title || '').slice(0, 60))}</span>
                                </div>
                                <div class="intel-metrics">
                                    <div class="intel-metric"><div class="intel-metric-label">Feedback</div><div class="intel-metric-value">${fbCount}</div></div>
                                    <div class="intel-metric"><div class="intel-metric-label">Created</div><div class="intel-metric-value">${r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}</div></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="pagination" id="expReelsPagination" hidden></div>
            </div>
        ` : ''}

        ${matchedFeedback.length ? `
            <div class="panel-card">
                <div class="panel-head"><span class="panel-title">Feedback Records</span><span class="panel-meta">${matchedFeedback.length} record${matchedFeedback.length === 1 ? '' : 's'}</span></div>
                <div class="panel-body panel-body--flush">
                    ${pagedFeedback.items.map(f => `
                        <div class="intel-row">
                            <div class="intel-head">
                                <span class="intel-id">${escapeHTML(f.reelId || '—')}</span>
                                <span class="intel-title">${escapeHTML(f.feeling || 'Feedback')}</span>
                                <span class="intel-label intel-label--${(Number(f.rating) >= 4) ? 'high' : (Number(f.rating) === 3 ? 'stable' : 'attention')}">${f.rating || '—'}/5</span>
                            </div>
                            <div class="intel-metrics">
                                <div class="intel-metric"><div class="intel-metric-label">Response ID</div><div class="intel-metric-value" style="font-size:11px;">${escapeHTML(f.id.slice(0, 14))}…</div></div>
                                <div class="intel-metric"><div class="intel-metric-label">Submitted</div><div class="intel-metric-value">${f.submittedAt ? new Date(f.submittedAt).toLocaleDateString('en-IN') : '—'}</div></div>
                            </div>
                            ${f.message ? `<div class="intel-insights"><span>${escapeHTML(f.message.slice(0, 100))}</span></div>` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="pagination" id="expFeedbackPagination" hidden></div>
            </div>
        ` : ''}

        ${!matchedReels.length && !matchedFeedback.length ? emptyBlock('No records match this search') : ''}
    `;

    renderPagination('expReelsPagination', pagedReels.page, pagedReels.totalPages, (p) => {
        expReelsPage = p;
        renderResults(window.__auditState);
    });
    renderPagination('expFeedbackPagination', pagedFeedback.page, pagedFeedback.totalPages, (p) => {
        expFeedbackPage = p;
        renderResults(window.__auditState);
    });
}
