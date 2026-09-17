/* ============================================================
   RUDRA BHAKTI — AUDIT: EXECUTIVE INTELLIGENCE
   ============================================================ */
import {
    createLineChart, createBarChart, createDonutChart,
    last14Days, pct, escapeHTML, emptyBlock, COLORS
} from './audit-charts.js';

export function init(state) { /* nothing extra — shell handles listeners */ }

export function render(state) {
    const el = document.getElementById('page-executive');
    if (!el) return;

    const reels = state.reels || [];
    const feedback = state.feedback || [];

    if (!feedback.length && !reels.length) {
        el.innerHTML = `
            <div class="section-head"><h2>Executive Intelligence</h2><p>No data available yet.</p></div>
            <div class="panel-card"><div class="panel-body">${emptyBlock('Waiting for reels and feedback')}</div></div>
        `;
        return;
    }

    /* ---------- KPIs ---------- */
    const totalReels = reels.length;
    const totalResponses = feedback.length;
    const rated = feedback.filter(f => f.rating != null);
    const avgRating = rated.length ? rated.reduce((s, f) => s + Number(f.rating || 0), 0) / rated.length : 0;
    const satisfaction = rated.length ? Math.round((avgRating / 5) * 100) : 0;

    const recYes = feedback.filter(f => {
        const v = (f.more || f.wouldWatchMore || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;
    const recommendPct = pct(recYes, totalResponses);

    /* ---------- 14-day chart data ---------- */
    const days = last14Days();
    const dayCount = {};
    days.forEach(d => dayCount[d.key] = 0);
    feedback.forEach(f => {
        const ts = Number(f.submittedAt) || 0;
        if (!ts) return;
        const k = new Date(ts).toISOString().slice(0, 10);
        if (k in dayCount) dayCount[k]++;
    });
    const lineLabels = days.map(d => d.label);
    const lineData = days.map(d => dayCount[d.key]);

    /* ---------- Top 5 reels by avg rating ---------- */
    const reelStats = reels.map(r => {
        const items = feedback.filter(f => f.reelId === r.id);
        const rr = items.filter(f => f.rating != null);
        const avg = rr.length ? rr.reduce((s, f) => s + Number(f.rating || 0), 0) / rr.length : 0;
        return { id: r.id, title: r.title || '', count: items.length, avg };
    }).filter(x => x.count >= 1).sort((a, b) => b.avg - a.avg);
    const top5 = reelStats.slice(0, 5);

    /* ---------- Sentiment split ---------- */
    let pos = 0, neu = 0, neg = 0;
    feedback.forEach(f => {
        const r = Number(f.rating) || 0;
        if (r >= 4) pos++;
        else if (r === 3) neu++;
        else if (r > 0) neg++;
    });
    const sentimentTotal = pos + neu + neg;
    const sentimentLabels = ['Positive', 'Neutral', 'Negative'];
    const sentimentData = sentimentTotal ? [pos, neu, neg] : [];
    const sentimentColors = [COLORS.success, '#999', COLORS.danger];

    /* ---------- Recent activity ---------- */
    const recent = [...feedback]
        .sort((a, b) => (Number(b.submittedAt) || 0) - (Number(a.submittedAt) || 0))
        .slice(0, 5);

    /* ---------- Build HTML ---------- */
    el.innerHTML = `
        <div class="section-head">
            <h2>Executive Intelligence</h2>
            <p>Live CEO-level overview across all reels and responses.</p>
        </div>

        <div class="stats" style="margin-bottom:18px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Total Reels</span>
                    <span class="stat-value">${totalReels}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Total Responses</span>
                    <span class="stat-value">${totalResponses}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Satisfaction</span>
                    <span class="stat-value">${satisfaction}%</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Recommend Rate</span>
                    <span class="stat-value">${recommendPct}%</span>
                </div>
            </div>
        </div>

        <div class="panel-card" style="margin-bottom:14px;">
            <div class="panel-head">
                <span class="panel-title">Responses — Last 14 Days</span>
                <span class="panel-meta">${totalResponses} total</span>
            </div>
            <div class="panel-body">
                <div class="chart-wrap"><canvas id="execLine"></canvas></div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div class="panel-card">
                <div class="panel-head"><span class="panel-title">Top 5 Reels by Rating</span></div>
                <div class="panel-body">
                    <div class="chart-wrap"><canvas id="execTop"></canvas></div>
                </div>
            </div>
            <div class="panel-card">
                <div class="panel-head"><span class="panel-title">Sentiment Split</span></div>
                <div class="panel-body">
                    ${sentimentTotal
                        ? `<div class="chart-wrap"><canvas id="execSent"></canvas></div>`
                        : emptyBlock('No rated responses yet')}
                </div>
            </div>
        </div>

        <div class="panel-card" style="margin-top:14px;">
            <div class="panel-head"><span class="panel-title">Recent Activity</span></div>
            <div class="panel-body panel-body--flush">
                ${recent.length
                    ? recent.map(f => {
                        const ts = f.submittedAt ? new Date(f.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
                        return `
                            <div class="reel-row" style="border-bottom:1px solid var(--border);">
                                <div class="reel-row-main">
                                    <div class="reel-row-top">
                                        <span class="reel-row-id">${escapeHTML(f.reelId || '—')}</span>
                                        <span class="reel-row-title">${escapeHTML(f.feeling || 'Feedback')}</span>
                                    </div>
                                    <div class="reel-row-url">${escapeHTML(f.name || 'Anonymous')} · ${ts}</div>
                                </div>
                                <div class="reel-row-actions">
                                    <span class="intel-label intel-label--${(Number(f.rating) >= 4) ? 'high' : (Number(f.rating) === 3 ? 'stable' : 'attention')}">${f.rating || '—'}/5</span>
                                </div>
                            </div>
                        `;
                    }).join('')
                    : emptyBlock('No responses yet')}
            </div>
        </div>
    `;

    /* ---------- Charts ---------- */
    createLineChart('execLine', lineLabels, [{
        label: 'Responses',
        data: lineData,
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(32,32,32,0.08)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5
    }]);

    if (top5.length) {
        createBarChart(
            'execTop',
            top5.map(r => r.id),
            [{
                label: 'Avg Rating',
                data: top5.map(r => Number(r.avg.toFixed(2))),
                backgroundColor: COLORS.accent,
                borderRadius: 6
            }],
            { legend: false }
        );
    }

    if (sentimentTotal) {
        createDonutChart('execSent', sentimentLabels, sentimentData, sentimentColors);
    }
}
