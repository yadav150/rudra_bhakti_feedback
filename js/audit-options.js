/* ============================================================
   RUDRA BHAKTI — AUDIT: OPTION INTELLIGENCE
   Aggregate option frequency across questions.
   ============================================================ */
import {
    createBarChart, createDonutChart,
    pct, escapeHTML, emptyBlock, COLORS, PALETTE
} from './audit-charts.js';

let selectedQuestion = 'all';

const QUESTION_KEYS = [
    { key: 'feeling',      label: 'Feeling' },
    { key: 'more',         label: 'Would Watch More' },
    { key: 'wantMore',     label: 'Wants More Of' },
    { key: 'engageAgain',  label: 'Engage Again' },
    { key: 'rating',       label: 'Rating' },
    { key: 'stoodOut',     label: 'Stood Out (legacy)' },
    { key: 'improve',      label: 'Improve (legacy)' }
];

export function init(state) {}

export function render(state) {
    window.__auditState = state;
    const el = document.getElementById('page-options');
    if (!el) return;

    if (!el.dataset.built) {
        el.dataset.built = '1';
        el.innerHTML = `
            <div class="section-head">
                <h2>Option Intelligence</h2>
                <p>Granular option-level distribution across all questions.</p>
            </div>
            <div class="toolbar" style="margin-bottom:14px;">
                <select id="auditOptQuestion" class="select" style="flex:1;min-width:200px;">
                    <option value="all">All Questions</option>
                    ${QUESTION_KEYS.map(q => `<option value="${q.key}">${escapeHTML(q.label)}</option>`).join('')}
                </select>
            </div>
            <div id="auditOptResults"></div>
        `;
        const sel = document.getElementById('auditOptQuestion');
        sel.value = selectedQuestion;
        sel.addEventListener('change', () => {
            selectedQuestion = sel.value;
            renderOptions(window.__auditState);
        });
    }

    renderOptions(state);
}

function renderOptions(state) {
    const container = document.getElementById('auditOptResults');
    if (!container) return;

    const feedback = (state && state.feedback) || [];

    if (!feedback.length) {
        container.innerHTML = `<div class="panel-card"><div class="panel-body">${emptyBlock('No responses yet')}</div></div>`;
        return;
    }

    /* Aggregate options */
    const counts = {};
    const reelMap = {};

    const keysToScan = selectedQuestion === 'all'
        ? QUESTION_KEYS.map(q => q.key)
        : [selectedQuestion];

    keysToScan.forEach(key => {
        feedback.forEach(f => {
            const v = f[key];
            if (v == null) return;
            const s = String(v).trim();
            if (!s) return;
            counts[s] = (counts[s] || 0) + 1;
            if (f.reelId) {
                if (!reelMap[s]) reelMap[s] = new Set();
                reelMap[s].add(f.reelId);
            }
        });
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);

    if (!sorted.length) {
        container.innerHTML = `<div class="panel-card"><div class="panel-body">${emptyBlock('No options recorded yet')}</div></div>`;
        return;
    }

    const top = sorted.slice(0, 8);
    const restCount = sorted.slice(8).reduce((s, [, v]) => s + v, 0);
    const donutLabels = restCount ? [...top.map(([k]) => k), 'Other'] : top.map(([k]) => k);
    const donutData = restCount ? [...top.map(([, v]) => v), restCount] : top.map(([, v]) => v);

    const maxCount = sorted[0][1];

    container.innerHTML = `
        <div class="stats" style="margin-bottom:18px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Unique Options</span>
                    <span class="stat-value">${sorted.length}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Total Selections</span>
                    <span class="stat-value">${total}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Top Option</span>
                    <span class="stat-value" style="font-size:16px;">${escapeHTML(sorted[0][0].slice(0, 18))}</span>
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
            <div class="panel-card">
                <div class="panel-head"><span class="panel-title">Distribution</span></div>
                <div class="panel-body"><div class="chart-wrap"><canvas id="optDonut"></canvas></div></div>
            </div>
            <div class="panel-card">
                <div class="panel-head"><span class="panel-title">Top 10 Options</span></div>
                <div class="panel-body"><div class="chart-wrap"><canvas id="optBar"></canvas></div></div>
            </div>
        </div>

        <div class="panel-card">
            <div class="panel-head">
                <span class="panel-title">All Options</span>
                <span class="panel-meta">${sorted.length} unique</span>
            </div>
            <div class="panel-body panel-body--flush">
                ${sorted.map(([k, v]) => {
                    const reels = reelMap[k] ? reelMap[k].size : 0;
                    return `
                        <div class="intel-row">
                            <div class="intel-head">
                                <span class="intel-title" style="flex:1;">${escapeHTML(k)}</span>
                                <span class="intel-label intel-label--stable">${pct(v, total)}%</span>
                            </div>
                            <div class="intel-metrics">
                                <div class="intel-metric"><div class="intel-metric-label">Count</div><div class="intel-metric-value">${v}</div></div>
                                <div class="intel-metric"><div class="intel-metric-label">Share</div><div class="intel-metric-value">${pct(v, total)}%</div></div>
                                <div class="intel-metric"><div class="intel-metric-label">Reels</div><div class="intel-metric-value">${reels}</div></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    createDonutChart('optDonut', donutLabels, donutData, PALETTE);

    createBarChart('optBar',
        top.map(([k]) => k.slice(0, 20)),
        [{
            label: 'Count',
            data: top.map(([, v]) => v),
            backgroundColor: COLORS.primary,
            borderRadius: 6
        }],
        { legend: false, horizontal: true }
    );
}
