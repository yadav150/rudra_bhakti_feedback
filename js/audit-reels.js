/* ============================================================
   RUDRA BHAKTI — AUDIT: REEL INTELLIGENCE
   Search by ID or Name. Focus-safe re-rendering.
   ============================================================ */
import {
    createBarChart,
    pct, escapeHTML, emptyBlock, COLORS
} from './audit-charts.js';

let searchMode = 'id';
let searchQuery = '';

export function init(state) { /* no-op */ }

export function render(state) {
    window.__auditState = state;
    const el = document.getElementById('page-reels');
    if (!el) return;

    /* Build skeleton once */
    if (!el.dataset.built) {
        el.dataset.built = '1';
        el.innerHTML = `
            <div class="section-head">
                <h2>Reel Intelligence</h2>
                <p>Deep per-reel analysis. Search by ID or name.</p>
            </div>

            <div class="toolbar" style="margin-bottom:14px;">
                <select id="auditReelMode" class="select">
                    <option value="id">Reel ID</option>
                    <option value="title">Reel Name / Title</option>
                </select>
                <div class="search">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input type="search" id="auditReelSearch" placeholder="Search by Reel ID…" autocomplete="off" spellcheck="false" />
                </div>
            </div>

            <div id="auditReelsResults"></div>
        `;

        const mode = document.getElementById('auditReelMode');
        const input = document.getElementById('auditReelSearch');

        mode.value = searchMode;
        input.value = searchQuery;
        updatePlaceholder(input, mode.value);

        mode.addEventListener('change', () => {
            searchMode = mode.value;
            searchQuery = '';
            input.value = '';
            updatePlaceholder(input, mode.value);
            renderResults(window.__auditState);
        });

        input.addEventListener('input', () => {
            searchQuery = input.value.trim().toLowerCase();
            renderResults(window.__auditState);
        });
    }

    renderResults(state);
}

function updatePlaceholder(input, mode) {
    input.placeholder = mode === 'id'
        ? 'Search by Reel ID… (e.g. RB003)'
        : 'Search by Name / Title…';
}

function renderResults(state) {
    const container = document.getElementById('auditReelsResults');
    if (!container) return;

    const reels = (state && state.reels) || [];
    const feedback = (state && state.feedback) || [];

    /* Filter by mode */
    let filtered = reels;
    if (searchQuery) {
        if (searchMode === 'id') {
            filtered = reels.filter(r => r.id.toLowerCase().includes(searchQuery));
        } else {
            filtered = reels.filter(r => (r.title || '').toLowerCase().includes(searchQuery));
        }
    }

    /* Compute per-reel stats */
    const reelStats = reels.map(r => {
        const items = feedback.filter(f => f.reelId === r.id);
        const rated = items.filter(f => f.rating != null);
        const avg = rated.length
            ? rated.reduce((s, f) => s + Number(f.rating || 0), 0) / rated.length
            : 0;
        const recYes = items.filter(f => {
            const v = (f.more || f.wouldWatchMore || '').toLowerCase();
            return v.startsWith('definitely') || v.startsWith('yes');
        }).length;
        return {
            id: r.id,
            title: r.title || '',
            count: items.length,
            avg: Number(avg.toFixed(2)),
            recommend: pct(recYes, items.length)
        };
    });

    const withData = reelStats.filter(x => x.count > 0).sort((a, b) => b.count - a.count);

    container.innerHTML = `
        ${withData.length ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                <div class="panel-card">
                    <div class="panel-head"><span class="panel-title">Responses per Reel</span></div>
                    <div class="panel-body"><div class="chart-wrap"><canvas id="reelsBarResponses"></canvas></div></div>
                </div>
                <div class="panel-card">
                    <div class="panel-head"><span class="panel-title">Avg Rating per Reel</span></div>
                    <div class="panel-body"><div class="chart-wrap"><canvas id="reelsBarRatings"></canvas></div></div>
                </div>
            </div>
        ` : ''}

        <div class="panel-card">
            <div class="panel-head">
                <span class="panel-title">All Reels</span>
                <span class="panel-meta">${filtered.length} of ${reels.length}</span>
            </div>
            <div class="panel-body panel-body--flush">
                ${filtered.length ? filtered.map(r => {
                    const s = reelStats.find(x => x.id === r.id) || { count: 0, avg: 0, recommend: 0 };
                    const label = s.count < 3
                        ? { text: 'Insufficient Data', cls: 'insufficient' }
                        : s.avg >= 4.5 && s.recommend >= 70 ? { text: 'High Performer', cls: 'high' }
                        : s.avg >= 4 && s.recommend >= 50 ? { text: 'Strong', cls: 'strong' }
                        : s.avg >= 3.5 ? { text: 'Stable', cls: 'stable' }
                        : { text: 'Attention', cls: 'attention' };
                    return `
                        <div class="intel-row">
                            <div class="intel-head">
                                <span class="intel-id">${escapeHTML(r.id)}</span>
                                <span class="intel-title">${escapeHTML(r.title || '')}</span>
                                <span class="intel-label intel-label--${label.cls}">${label.text}</span>
                            </div>
                            <div class="intel-metrics">
                                <div class="intel-metric"><div class="intel-metric-label">Responses</div><div class="intel-metric-value">${s.count}</div></div>
                                <div class="intel-metric"><div class="intel-metric-label">Rating</div><div class="intel-metric-value">${s.avg ? s.avg.toFixed(2) : '—'}</div></div>
                                <div class="intel-metric"><div class="intel-metric-label">Recommend</div><div class="intel-metric-value">${s.count ? s.recommend + '%' : '—'}</div></div>
                            </div>
                        </div>
                    `;
                }).join('') : emptyBlock('No reels match this search')}
            </div>
        </div>
    `;

    if (withData.length) {
        createBarChart('reelsBarResponses',
            withData.map(x => x.id),
            [{
                label: 'Responses',
                data: withData.map(x => x.count),
                backgroundColor: COLORS.primary,
                borderRadius: 6
            }],
            { legend: false }
        );

        createBarChart('reelsBarRatings',
            withData.map(x => x.id),
            [{
                label: 'Avg Rating',
                data: withData.map(x => x.avg),
                backgroundColor: COLORS.accent,
                borderRadius: 6
            }],
            { legend: false }
        );
    }
}
