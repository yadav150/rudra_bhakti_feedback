/* ============================================================
   RUDRA BHAKTI — AUDIT: AUDIT TRAIL
   Shows auditLog entries (populated by write-hooks in Batch 7).
   ============================================================ */
import {
    createLineChart,
    escapeHTML, emptyBlock, COLORS,
    paginate, renderPagination
} from './audit-charts.js';

let filterAction = 'all';
let trailPage = 1;

export function init(state) {}

export function render(state) {
    window.__auditState = state;
    const el = document.getElementById('page-trail');
    if (!el) return;

    if (!el.dataset.built) {
        el.dataset.built = '1';
        el.innerHTML = `
            <div class="section-head">
                <h2>Audit Trail</h2>
                <p>Change history — every record write, update, delete.</p>
            </div>

            <div class="toolbar" style="margin-bottom:14px;">
                <select id="trailAction" class="select">
                    <option value="all">All Actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                </select>
            </div>

            <div id="trailResults"></div>
        `;
        const sel = document.getElementById('trailAction');
        sel.value = filterAction;
        sel.addEventListener('change', () => {
            filterAction = sel.value;
            trailPage = 1;
            renderTrail(window.__auditState);
        });
    }

    renderTrail(state);
}

function renderTrail(state) {
    const container = document.getElementById('trailResults');
    if (!container) return;

    const log = (state && state.auditLog) || [];

    let filtered = log;
    if (filterAction !== 'all') {
        filtered = log.filter(e => (e.action || '').toLowerCase() === filterAction);
    }

    const paged = paginate(filtered, trailPage, 5);

    if (!log.length) {
        container.innerHTML = `
            <div class="stats" style="margin-bottom:14px;">
                <div class="stat">
                    <div class="stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <div class="stat-body">
                        <span class="stat-label">Total Events</span>
                        <span class="stat-value">0</span>
                    </div>
                </div>
            </div>
            <div class="panel-card">
                <div class="panel-body">
                    ${emptyBlock('Audit log is empty. Events will appear here once write-hooks are active (Batch 7).')}
                </div>
            </div>
        `;
        return;
    }

    /* 30-day event timeline */
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        days.push({ key: k, label: k.slice(5) });
    }
    const dayCount = {};
    days.forEach(d => dayCount[d.key] = 0);
    log.forEach(e => {
        if (!e.ts) return;
        const k = new Date(e.ts).toISOString().slice(0, 10);
        if (k in dayCount) dayCount[k]++;
    });

    /* Action breakdown */
    const actionCounts = {};
    log.forEach(e => {
        const a = (e.action || 'unknown').toLowerCase();
        actionCounts[a] = (actionCounts[a] || 0) + 1;
    });

    container.innerHTML = `
        <div class="stats" style="margin-bottom:14px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Total Events</span>
                    <span class="stat-value">${log.length}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Filtered</span>
                    <span class="stat-value">${filtered.length}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Top Action</span>
                    <span class="stat-value" style="font-size:16px;">${Object.entries(actionCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—'}</span>
                </div>
            </div>
        </div>

        <div class="panel-card" style="margin-bottom:14px;">
            <div class="panel-head"><span class="panel-title">Events — Last 30 Days</span></div>
            <div class="panel-body"><div class="chart-wrap"><canvas id="trailChart"></canvas></div></div>
        </div>

        <div class="panel-card">
            <div class="panel-head">
                <span class="panel-title">Event Log</span>
                <span class="panel-meta">${filtered.length} entries</span>
            </div>
            <div class="panel-body panel-body--flush">
                ${paged.items.map(e => `
                    <div class="intel-row">
                        <div class="intel-head">
                            <span class="intel-id">${escapeHTML(e.action || '—')}</span>
                            <span class="intel-title">${escapeHTML(e.target || '—')}</span>
                            <span class="intel-label intel-label--${e.action === 'delete' ? 'attention' : (e.action === 'create' ? 'high' : 'stable')}">${escapeHTML(e.module || '—')}</span>
                        </div>
                        <div class="intel-metrics">
                            <div class="intel-metric"><div class="intel-metric-label">User</div><div class="intel-metric-value" style="font-size:11px;">${escapeHTML((e.user || '—').slice(0, 20))}</div></div>
                            <div class="intel-metric"><div class="intel-metric-label">Time</div><div class="intel-metric-value">${e.ts ? new Date(e.ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</div></div>
                        </div>
                        ${e.before || e.after ? `
                            <div class="intel-insights">
                                ${e.before ? `<span><strong>Before:</strong> ${escapeHTML(String(e.before).slice(0, 80))}</span>` : ''}
                                ${e.after ? `<span><strong>After:</strong> ${escapeHTML(String(e.after).slice(0, 80))}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            <div class="pagination" id="trailPagination" hidden></div>
        </div>
    `;

    renderPagination('trailPagination', paged.page, paged.totalPages, (p) => {
        trailPage = p;
        renderTrail(window.__auditState);
    });

    createLineChart('trailChart', days.map(d => d.label), [{
        label: 'Events',
        data: days.map(d => dayCount[d.key]),
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(32,32,32,0.08)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 2
    }], { legend: false });
}
