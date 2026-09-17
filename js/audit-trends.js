/* ============================================================
   RUDRA BHAKTI — AUDIT: TREND & PERFORMANCE
   Rolling 30-day trends + week-over-week deltas.
   ============================================================ */
import {
    createLineChart, createBarChart,
    last14Days,
    pct, escapeHTML, emptyBlock, COLORS
} from './audit-charts.js';

export function init(state) {}

export function render(state) {
    const el = document.getElementById('page-trends');
    if (!el) return;

    const feedback = state.feedback || [];

    if (!feedback.length) {
        el.innerHTML = `
            <div class="section-head"><h2>Trend & Performance</h2><p>No responses yet.</p></div>
            <div class="panel-card"><div class="panel-body">${emptyBlock('Waiting for data')}</div></div>
        `;
        return;
    }

    /* ---------- 30-day rolling ---------- */
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        days.push({ key: k, label: k.slice(5) });
    }
    const dayCount = {};
    const dayRatings = {};
    days.forEach(d => { dayCount[d.key] = 0; dayRatings[d.key] = []; });

    feedback.forEach(f => {
        const ts = Number(f.submittedAt) || 0;
        if (!ts) return;
        const k = new Date(ts).toISOString().slice(0, 10);
        if (k in dayCount) {
            dayCount[k]++;
            if (f.rating != null) dayRatings[k].push(Number(f.rating));
        }
    });

    const volumeLabels = days.map(d => d.label);
    const volumeData = days.map(d => dayCount[d.key]);
    const ratingData = days.map(d => {
        const arr = dayRatings[d.key];
        return arr.length ? Number((arr.reduce((s, r) => s + r, 0) / arr.length).toFixed(2)) : null;
    });

    /* ---------- Week-over-week ---------- */
    const weekNow = Date.now();
    const last7 = feedback.filter(f => {
        const t = Number(f.submittedAt) || 0;
        return t && weekNow - t <= 7 * 864e5;
    });
    const prev7 = feedback.filter(f => {
        const t = Number(f.submittedAt) || 0;
        return t && weekNow - t > 7 * 864e5 && weekNow - t <= 14 * 864e5;
    });

    const avgOf = (arr) => {
        const rated = arr.filter(f => f.rating != null);
        if (!rated.length) return 0;
        return rated.reduce((s, f) => s + Number(f.rating), 0) / rated.length;
    };

    const last7Count = last7.length;
    const prev7Count = prev7.length;
    const last7Avg = avgOf(last7);
    const prev7Avg = avgOf(prev7);
    const countDelta = prev7Count ? Math.round(((last7Count - prev7Count) / prev7Count) * 100) : 0;
    const ratingDelta = prev7Avg ? Number((last7Avg - prev7Avg).toFixed(2)) : 0;

    /* Week comparison chart */
    const weekLabels = ['Prev 7d', 'Last 7d'];
    const weekCounts = [prev7Count, last7Count];
    const weekRatings = [Number(prev7Avg.toFixed(2)), Number(last7Avg.toFixed(2))];

    /* ---------- Reel activity ranking ---------- */
    const reelActivity = (state.reels || []).map(r => {
        const items = feedback.filter(f => f.reelId === r.id);
        const last7Items = items.filter(f => {
            const t = Number(f.submittedAt) || 0;
            return t && weekNow - t <= 7 * 864e5;
        });
        return {
            id: r.id,
            title: r.title || '',
            total: items.length,
            recent: last7Items.length
        };
    }).filter(x => x.total > 0).sort((a, b) => b.recent - a.recent || b.total - a.total);

    const top5Active = reelActivity.slice(0, 5);

    el.innerHTML = `
        <div class="section-head">
            <h2>Trend & Performance</h2>
            <p>30-day rolling trends and week-over-week deltas.</p>
        </div>

        <div class="stats" style="margin-bottom:18px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Last 7 days</span>
                    <span class="stat-value">${last7Count}</span>
                    <span class="exec-sub" style="color:${countDelta >= 0 ? '#1d7a3d' : '#b03030'};margin-top:2px;">${countDelta >= 0 ? '+' : ''}${countDelta}% vs prior week</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Avg Rating (7d)</span>
                    <span class="stat-value">${last7Avg.toFixed(2)}</span>
                    <span class="exec-sub" style="color:${ratingDelta >= 0 ? '#1d7a3d' : '#b03030'};margin-top:2px;">${ratingDelta >= 0 ? '+' : ''}${ratingDelta} vs prior week</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Total (30d)</span>
                    <span class="stat-value">${feedback.length}</span>
                </div>
            </div>
        </div>

        <div class="panel-card" style="margin-bottom:14px;">
            <div class="panel-head"><span class="panel-title">Response Volume — 30 Days</span></div>
            <div class="panel-body"><div class="chart-wrap"><canvas id="trendVolume"></canvas></div></div>
        </div>

        <div class="panel-card" style="margin-bottom:14px;">
            <div class="panel-head"><span class="panel-title">Avg Rating — 30 Days</span></div>
            <div class="panel-body"><div class="chart-wrap"><canvas id="trendRating"></canvas></div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div class="panel-card">
                <div class="panel-head"><span class="panel-title">Week-over-Week Volume</span></div>
                <div class="panel-body"><div class="chart-wrap chart-wrap--short"><canvas id="trendWeekVol"></canvas></div></div>
            </div>
            <div class="panel-card">
                <div class="panel-head"><span class="panel-title">Week-over-Week Rating</span></div>
                <div class="panel-body"><div class="chart-wrap chart-wrap--short"><canvas id="trendWeekRate"></canvas></div></div>
            </div>
        </div>

        ${top5Active.length ? `
            <div class="panel-card" style="margin-top:14px;">
                <div class="panel-head">
                    <span class="panel-title">Most Active Reels (last 7 days)</span>
                    <span class="panel-meta">Top 5</span>
                </div>
                <div class="panel-body panel-body--flush">
                    ${top5Active.map(r => `
                        <div class="intel-row">
                            <div class="intel-head">
                                <span class="intel-id">${escapeHTML(r.id)}</span>
                                <span class="intel-title">${escapeHTML((r.title || '').slice(0, 50))}</span>
                            </div>
                            <div class="intel-metrics">
                                <div class="intel-metric"><div class="intel-metric-label">Total</div><div class="intel-metric-value">${r.total}</div></div>
                                <div class="intel-metric"><div class="intel-metric-label">Last 7d</div><div class="intel-metric-value">${r.recent}</div></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;

    createLineChart('trendVolume', volumeLabels, [{
        label: 'Responses',
        data: volumeData,
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(32,32,32,0.08)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5
    }]);

    createLineChart('trendRating', volumeLabels, [{
        label: 'Avg Rating',
        data: ratingData,
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(37,99,235,0.08)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
        spanGaps: true
    }], { legend: false });

    createBarChart('trendWeekVol', weekLabels, [{
        label: 'Responses',
        data: weekCounts,
        backgroundColor: [COLORS.muted, COLORS.primary],
        borderRadius: 6
    }], { legend: false });

    createBarChart('trendWeekRate', weekLabels, [{
        label: 'Avg Rating',
        data: weekRatings,
        backgroundColor: [COLORS.muted, COLORS.accent],
        borderRadius: 6
    }], { legend: false });
}
