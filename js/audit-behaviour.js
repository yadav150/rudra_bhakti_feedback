/* ============================================================
   RUDRA BHAKTI — AUDIT: BEHAVIOUR INTELLIGENCE
   ============================================================ */
import {
    createLineChart, createBarChart,
    computeISTHour, computeISTWeekday,
    pct, escapeHTML, emptyBlock, COLORS
} from './audit-charts.js';

export function init(state) {}

export function render(state) {
    const el = document.getElementById('page-behaviour');
    if (!el) return;

    const feedback = state.feedback || [];
    const reels = state.reels || [];

    if (!feedback.length) {
        el.innerHTML = `
            <div class="section-head"><h2>Behaviour Intelligence</h2><p>No responses yet.</p></div>
            <div class="panel-card"><div class="panel-body">${emptyBlock('Waiting for feedback data')}</div></div>
        `;
        return;
    }

    /* Hour of day (24 buckets) */
    const hours = new Array(24).fill(0);
    feedback.forEach(f => {
        const ts = Number(f.submittedAt) || 0;
        if (ts) hours[computeISTHour(ts)]++;
    });

    /* Weekday */
    const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekdays = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    feedback.forEach(f => {
        const ts = Number(f.submittedAt) || 0;
        if (ts) weekdays[computeISTWeekday(ts)]++;
    });

    /* Peak */
    const peakHour = hours.indexOf(Math.max(...hours));
    const peakWeekday = Object.entries(weekdays).sort((a, b) => b[1] - a[1])[0];

    /* Written vs Rating-only */
    const written = feedback.filter(f => (f.message || '').trim()).length;
    const rated = feedback.filter(f => f.rating != null).length;
    const ratedOnly = rated - feedback.filter(f => (f.message || '').trim() && f.rating != null).length;

    /* Velocity: responses per day since first response */
    const tsList = feedback.map(f => Number(f.submittedAt) || 0).filter(t => t > 0);
    const firstTs = tsList.length ? Math.min(...tsList) : 0;
    const lastTs = tsList.length ? Math.max(...tsList) : 0;
    const spanDays = firstTs && lastTs && lastTs > firstTs ? Math.max(1, Math.ceil((lastTs - firstTs) / 864e5)) : 1;
    const velocity = (feedback.length / spanDays).toFixed(1);

    el.innerHTML = `
        <div class="section-head">
            <h2>Behaviour Intelligence</h2>
            <p>When and how your audience engages. Times in IST.</p>
        </div>

        <div class="stats" style="margin-bottom:18px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Peak Hour</span>
                    <span class="stat-value">${peakHour}:00</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Peak Weekday</span>
                    <span class="stat-value">${peakWeekday ? peakWeekday[0] : '—'}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Velocity</span>
                    <span class="stat-value">${velocity}/day</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Written Rate</span>
                    <span class="stat-value">${pct(written, feedback.length)}%</span>
                </div>
            </div>
        </div>

        <div class="panel-card" style="margin-bottom:14px;">
            <div class="panel-head"><span class="panel-title">Responses by Hour (IST)</span></div>
            <div class="panel-body"><div class="chart-wrap"><canvas id="behHours"></canvas></div></div>
        </div>

        <div class="panel-card">
            <div class="panel-head"><span class="panel-title">Responses by Weekday</span></div>
            <div class="panel-body"><div class="chart-wrap"><canvas id="behWeek"></canvas></div></div>
        </div>
    `;

    createBarChart('behHours',
        hours.map((_, i) => String(i).padStart(2, '0') + ':00'),
        [{
            label: 'Responses',
            data: hours,
            backgroundColor: hours.map((v, i) => i === peakHour ? COLORS.accent : COLORS.primary),
            borderRadius: 4
        }],
        { legend: false }
    );

    createBarChart('behWeek',
        weekdayOrder,
        [{
            label: 'Responses',
            data: weekdayOrder.map(d => weekdays[d]),
            backgroundColor: weekdayOrder.map(d => peakWeekday && d === peakWeekday[0] ? COLORS.accent : COLORS.primary),
            borderRadius: 6
        }],
        { legend: false }
    );
}
