/* ============================================================
   RUDRA BHAKTI — AUDIT: REEL INTELLIGENCE
   ============================================================ */
import {
    createBarChart, createLineChart,
    pct, escapeHTML, emptyBlock, COLORS
} from './audit-charts.js';

let searchMode = 'id';
let searchQuery = '';

export function init(state) {
    /* Bind inputs once — module loaded on first visit */
    setTimeout(() => {
        const mode = document.getElementById('auditReelMode');
        const input = document.getElementById('auditReelSearch');
        if (mode && !mode.dataset.bound) {
            mode.dataset.bound = '1';
            mode.addEventListener('change', () => {
                searchMode = mode.value;
                searchQuery = '';
                if (input) input.value = '';
                input.placeholder = searchMode === 'id' ? 'Search by Reel ID…' : 'Search by Name / Title…';
                render(window.__auditState);
            });
        }
        if (input && !input.dataset.bound) {
            input.dataset.bound = '1';
            input.addEventListener('input', () => {
                searchQuery = input.value.trim().toLowerCase();
                render(window.__auditState);
            });
        }
    }, 50);
}

export function render(state) {
    window.__auditState = state;
    const el = document.getElementById('page-reels');
    if (!el) return;

    const reels = state.reels || [];
    const feedback = state.feedback || [];

    /* Filter by mode */
    let filtered = reels;
    if (searchQuery) {
        if (searchMode === 'id') {
            filtered = reels.filter(r => r.id.toLowerCase().includes(searchQuery));
        } else {
            filtered = reels.filter(r => (r.title || '').toLowerCase().includes(searchQuery));
        }
    }

    /* Compute stats */
    const reelStats = reels.map(r => {
        const items = feedback.filter(f => f.reelId === r.id);
        const rated = items.filter(f => f.rating != null);
        const avg = rated.length ? rated.reduce((s, f) => s + Number(f.rating || 0), 0) / rated.length : 0;
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

    /* Chart data (all reels with at least 1 response) */
    const withData = reelStats.filter(x => x.count > 0).sort((a, b) => b.count - a.count);
    const chartLabels = withData.map(x => x.id);
    const chartCounts = withData.map(x => x.count);
    const chartRatings = withData.map(x => x.avg);

    el.innerHTML = `
        <div class="section-head">
            <h2>Reel Intelligence</h2>
            <p>Deep per-reel analysis. Search by ID or name.</p>
        </div>

        <div class="toolbar" style="margin-bottom:14px;">
            <select id="auditReelMode" class="select">
                <option value="id" ${searchMode === 'id' ? 'selected' : ''}>Reel ID</option>
                <option value="title" ${searchMode === 'title' ? 'selected' : ''}>Reel Name / Title</option>
            </select>
            <div class="search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input type="search" id="auditReelSearch" placeholder="${searchMode === 'id' ? 'Search by Reel ID…' : 'Search by Name / Title…'}" value="${escapeHTML(searchQuery)}" />
            </div>
        </div>

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
                    const s = reelStats.find(x => x.id === r.id);
                    const label = !s || s.count < 3
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
                                <div class="intel-metric"><div class="intel-metric-label">Responses</div><div class="intel-metric-value">${s ? s.count : 0}</div></div>
                                <div class="intel-metric"><div class="intel-metric-label">Rating</div><div class="intel-metric-value">${s && s.avg ? s.avg.toFixed(2) : '—'}</div></div>
                                <div class="intel-metric"><div class="intel-metric-label">Recommend</div><div class="intel-metric-value">${s ? s.recommend + '%' : '—'}</div></div>
                            </div>
                        </div>
                    `;
                }).join('') : emptyBlock('No reels match this search')}
            </div>
        </div>
    `;

    if (withData.length) {
        createBarChart('reelsBarResponses', chartLabels, [{
            label: 'Responses',
            data: chartCounts,
            backgroundColor: COLORS.primary,
            borderRadius: 6
        }], { legend: false });

        createBarChart('reelsBarRatings', chartLabels, [{
            label: 'Avg Rating',
            data: chartRatings,
            backgroundColor: COLORS.accent,
            borderRadius: 6
        }], { legend: false });
    }

    /* Rebind inputs after innerHTML replacement */
    setTimeout(() => {
        const m = document.getElementById('auditReelMode');
        const i = document.getElementById('auditReelSearch');
        if (m) m.onchange = () => { searchMode = m.value; searchQuery = ''; render(window.__auditState); };
        if (i) i.oninput = () => { searchQuery = i.value.trim().toLowerCase(); render(window.__auditState); };
    }, 0);
}
