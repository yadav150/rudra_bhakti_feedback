/* ============================================================
   RUDRA BHAKTI — AUDIT: DATA INTEGRITY
   Detect orphans, duplicates, missing fields, broken refs.
   ============================================================ */
import {
    createBarChart, createDonutChart,
    escapeHTML, emptyBlock, COLORS,
    paginate, renderPagination
} from './audit-charts.js';

let integrityPage = 1;

export function init(state) {}

export function render(state) {
    const el = document.getElementById('page-integrity');
    if (!el) return;

    const reels = (state && state.reels) || [];
    const feedback = (state && state.feedback) || [];

    const issues = [];
    const reelIds = new Set(reels.map(r => r.id));
    const feedbackIds = new Set();

    /* Check reels */
    reels.forEach(r => {
        if (!r.id || !/^RB\d{3,}$/i.test(r.id)) {
            issues.push({ severity: 'significant', type: 'Invalid Reel ID', target: r.id || '(missing)', detail: `ID "${r.id}" doesn't match RB### pattern` });
        }
        if (!r.title || !r.title.trim()) {
            issues.push({ severity: 'minor', type: 'Missing Title', target: r.id, detail: 'Reel has no title' });
        }
        if (!r.url || !r.url.trim()) {
            issues.push({ severity: 'minor', type: 'Missing URL', target: r.id, detail: 'Reel has no source URL' });
        }
        if (!r.createdAt) {
            issues.push({ severity: 'minor', type: 'Missing createdAt', target: r.id, detail: 'No creation timestamp' });
        }
    });

    /* Check feedback */
    feedback.forEach(f => {
        if (feedbackIds.has(f.id)) {
            issues.push({ severity: 'critical', type: 'Duplicate Response ID', target: f.id, detail: 'Same ID appears twice' });
        }
        feedbackIds.add(f.id);

        if (!f.reelId) {
            issues.push({ severity: 'significant', type: 'Missing reelId', target: f.id, detail: 'Feedback not linked to any reel' });
        } else if (!reelIds.has(f.reelId)) {
            issues.push({ severity: 'significant', type: 'Orphan Feedback', target: f.id, detail: `References ${f.reelId} which doesn't exist in reels/` });
        }

        if (f.rating == null || f.rating === '') {
            issues.push({ severity: 'minor', type: 'Missing Rating', target: f.id, detail: 'Feedback has no rating' });
        } else {
            const r = Number(f.rating);
            if (isNaN(r) || r < 1 || r > 5) {
                issues.push({ severity: 'significant', type: 'Invalid Rating', target: f.id, detail: `Rating "${f.rating}" is not 1-5` });
            }
        }

        if (!f.submittedAt) {
            issues.push({ severity: 'minor', type: 'Missing Timestamp', target: f.id, detail: 'No submission timestamp' });
        } else if (Number(f.submittedAt) > Date.now() + 864e5) {
            issues.push({ severity: 'minor', type: 'Future Timestamp', target: f.id, detail: 'Timestamp is more than 1 day in the future' });
        }
    });

    /* Orphan reels (no feedback) */
    const reelUsage = {};
    feedback.forEach(f => { if (f.reelId) reelUsage[f.reelId] = (reelUsage[f.reelId] || 0) + 1; });
    reels.forEach(r => {
        if (!reelUsage[r.id]) {
            issues.push({ severity: 'minor', type: 'Unused Reel', target: r.id, detail: 'Reel has zero feedback records' });
        }
    });

    /* Sort by severity */
    const sevRank = { critical: 0, significant: 1, minor: 2 };
    issues.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

    const counts = {
        critical: issues.filter(i => i.severity === 'critical').length,
        significant: issues.filter(i => i.severity === 'significant').length,
        minor: issues.filter(i => i.severity === 'minor').length
    };
    const total = issues.length;
    const totalRecords = reels.length + feedback.length;
    const healthPct = totalRecords ? Math.max(0, Math.round(((totalRecords - total) / totalRecords) * 100)) : 100;

    const healthIcon = healthPct >= 90 ? '🟢' : healthPct >= 70 ? '🟡' : '🔴';
    const paged = paginate(issues, integrityPage, 5);

    el.innerHTML = `
        <div class="section-head">
            <h2>Data Integrity</h2>
            <p>Automatic detection of orphans, duplicates, missing fields, broken references.</p>
        </div>

        <div class="stats" style="margin-bottom:18px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Health Score</span>
                    <span class="stat-value">${healthPct}%</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Critical</span>
                    <span class="stat-value" style="color:${counts.critical ? '#b03030' : 'inherit'};">${counts.critical}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Significant</span>
                    <span class="stat-value" style="color:${counts.significant ? '#7c6b00' : 'inherit'};">${counts.significant}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Minor</span>
                    <span class="stat-value">${counts.minor}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Records Scanned</span>
                    <span class="stat-value">${totalRecords}</span>
                </div>
            </div>
        </div>

        ${total > 0 ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                <div class="panel-card">
                    <div class="panel-head"><span class="panel-title">Issues by Severity</span></div>
                    <div class="panel-body"><div class="chart-wrap chart-wrap--short"><canvas id="integBar"></canvas></div></div>
                </div>
                <div class="panel-card">
                    <div class="panel-head"><span class="panel-title">Health Distribution</span></div>
                    <div class="panel-body"><div class="chart-wrap chart-wrap--short"><canvas id="integDonut"></canvas></div></div>
                </div>
            </div>
        ` : ''}

        <div class="panel-card">
            <div class="panel-head">
                <span class="panel-title">Detected Issues</span>
                <span class="panel-meta">${total} issue${total === 1 ? '' : 's'}</span>
            </div>
            <div class="panel-body panel-body--flush">
                ${total ? paged.items.map(i => {
                    const clsMap = { critical: 'attention', significant: 'warning', minor: 'info' };
                    const classKey = clsMap[i.severity] || 'info';
                    return `
                        <div class="alert-item alert-item--${classKey}" style="margin:12px 18px;">
                            <div class="alert-title">
                                <span class="intel-label intel-label--${i.severity === 'critical' ? 'attention' : i.severity === 'significant' ? 'stable' : 'insufficient'}" style="margin-right:8px;">${i.severity}</span>
                                ${escapeHTML(i.type)}
                            </div>
                            <div class="alert-desc">
                                <strong style="color:var(--text);">${escapeHTML(i.target)}</strong> — ${escapeHTML(i.detail)}
                            </div>
                        </div>
                    `;
                }).join('') : emptyBlock('No integrity issues detected ✓')}
            </div>
            <div class="pagination" id="integrityPagination" hidden></div>
        </div>
    `;

    renderPagination('integrityPagination', paged.page, paged.totalPages, (p) => {
        integrityPage = p;
        render(state);
    });

    if (total > 0) {
        createBarChart('integBar',
            ['Critical', 'Significant', 'Minor'],
            [{
                label: 'Count',
                data: [counts.critical, counts.significant, counts.minor],
                backgroundColor: ['#b03030', '#7c6b00', '#666'],
                borderRadius: 6
            }],
            { legend: false }
        );

        createDonutChart('integDonut',
            ['Healthy', 'Issues'],
            [totalRecords - total, total],
            [COLORS.success, COLORS.danger]
        );
    }
}
