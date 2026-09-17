/* ============================================================
   RUDRA BHAKTI — AUDIT CHART HELPERS
   Wraps Chart.js with shared theming and lifecycle management.
   ============================================================ */

const charts = {};

export const COLORS = {
    primary: '#202020',
    accent: '#2563eb',
    success: '#1d7a3d',
    warn: '#7c6b00',
    danger: '#b03030',
    grid: '#e3e3df',
    muted: '#777',
    soft: '#fafaf8'
};

export const PALETTE = ['#202020','#2563eb','#1d7a3d','#7c6b00','#b03030','#666','#999'];

const baseFont = { family: 'Inter', size: 11 };

export function destroyChart(id) {
    if (charts[id]) {
        try { charts[id].destroy(); } catch (e) { /* silent */ }
        delete charts[id];
    }
}

export function destroyAll() {
    Object.keys(charts).forEach(destroyChart);
}

export function createLineChart(canvasId, labels, datasets, opts = {}) {
    destroyChart(canvasId);
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return null;
    const ctx = el.getContext('2d');
    const c = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: opts.legend !== false,
                    position: 'bottom',
                    labels: { font: baseFont, color: COLORS.muted, boxWidth: 12, padding: 12 }
                },
                tooltip: {
                    backgroundColor: COLORS.primary,
                    titleFont: baseFont,
                    bodyFont: baseFont,
                    padding: 10,
                    cornerRadius: 6
                }
            },
            scales: {
                x: {
                    grid: { color: COLORS.grid, drawBorder: false },
                    ticks: { font: baseFont, color: COLORS.muted }
                },
                y: {
                    grid: { color: COLORS.grid, drawBorder: false },
                    ticks: { font: baseFont, color: COLORS.muted, precision: 0 },
                    beginAtZero: true
                }
            }
        }
    });
    charts[canvasId] = c;
    return c;
}

export function createBarChart(canvasId, labels, datasets, opts = {}) {
    destroyChart(canvasId);
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return null;
    const ctx = el.getContext('2d');
    const c = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: opts.horizontal ? 'y' : 'x',
            plugins: {
                legend: {
                    display: opts.legend !== false,
                    position: 'bottom',
                    labels: { font: baseFont, color: COLORS.muted, boxWidth: 12, padding: 12 }
                },
                tooltip: {
                    backgroundColor: COLORS.primary,
                    titleFont: baseFont,
                    bodyFont: baseFont,
                    padding: 10,
                    cornerRadius: 6
                }
            },
            scales: {
                x: {
                    grid: { color: COLORS.grid, drawBorder: false },
                    ticks: { font: baseFont, color: COLORS.muted, precision: 0 },
                    beginAtZero: true
                },
                y: {
                    grid: { color: COLORS.grid, drawBorder: false },
                    ticks: { font: baseFont, color: COLORS.muted, precision: 0 },
                    beginAtZero: true
                }
            }
        }
    });
    charts[canvasId] = c;
    return c;
}

export function createDonutChart(canvasId, labels, data, colors) {
    destroyChart(canvasId);
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return null;
    const ctx = el.getContext('2d');
    const palette = colors || PALETTE;
    const c = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: palette,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: baseFont, color: COLORS.muted, boxWidth: 12, padding: 12 }
                },
                tooltip: {
                    backgroundColor: COLORS.primary,
                    titleFont: baseFont,
                    bodyFont: baseFont,
                    padding: 10,
                    cornerRadius: 6
                }
            }
        }
    });
    charts[canvasId] = c;
    return c;
}

/* ============================================================
   SHARED DATA HELPERS
   ============================================================ */
export function last14Days() {
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ key, label: key.slice(5) });
    }
    return days;
}

export function computeISTHour(ts) {
    const s = new Date(ts).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false });
    return parseInt(s, 10) % 24;
}

export function computeISTWeekday(ts) {
    return new Date(ts).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
}

export function pct(n, d) {
    if (!d) return 0;
    return Math.round((n / d) * 100);
}

export function escapeHTML(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function emptyBlock(text) {
    return `<div class="chart-empty"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-5"/></svg><p>${escapeHTML(text)}</p></div>`;
}
