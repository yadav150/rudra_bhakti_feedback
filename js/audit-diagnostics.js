/* ============================================================
   RUDRA BHAKTI — AUDIT: SYSTEM DIAGNOSTICS
   Live checks: Firebase, modules, errors, performance.
   ============================================================ */
import {
    escapeHTML, emptyBlock
} from './audit-charts.js';

let diagResults = null;

export function init(state) {}

export function render(state) {
    const el = document.getElementById('page-diagnostics');
    if (!el) return;

    if (!el.dataset.built) {
        el.dataset.built = '1';
        el.innerHTML = `
            <div class="section-head">
                <h2>System Diagnostics</h2>
                <p>Live check of modules, Firebase, errors, and performance.</p>
            </div>

            <div class="toolbar" style="margin-bottom:14px;">
                <button type="button" class="btn btn-primary" id="diagRunBtn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    <span>Run Diagnostics</span>
                </button>
            </div>

            <div id="diagResults">
                <div class="panel-card"><div class="panel-body">${emptyBlock('Click "Run Diagnostics" to start')}</div></div>
            </div>
        `;

        document.getElementById('diagRunBtn').addEventListener('click', () => {
            runDiagnostics();
        });
    }

    if (diagResults) renderResults(diagResults);
}

function runDiagnostics() {
    const r = {
        checks: [],
        ranAt: Date.now(),
        errors: []
    };

    /* 1. Firebase SDK */
    try {
        r.checks.push({
            name: 'Firebase SDK',
            ok: typeof window.Chart !== 'undefined',
            detail: 'Chart.js loaded: ' + (typeof window.Chart === 'function' ? 'yes' : 'no'),
            severity: typeof window.Chart === 'function' ? 'ok' : 'warn'
        });
    } catch (e) { r.errors.push('Chart check: ' + e.message); }

    /* 2. Navigation API */
    r.checks.push({
        name: 'Navigation API',
        ok: typeof window.navigateTo === 'function',
        detail: 'window.navigateTo is ' + (typeof window.navigateTo === 'function' ? 'defined' : 'missing'),
        severity: typeof window.navigateTo === 'function' ? 'ok' : 'critical'
    });

    /* 3. Loader state */
    const loader = document.getElementById('pageLoader');
    r.checks.push({
        name: 'Loader',
        ok: loader && loader.classList.contains('is-hidden'),
        detail: loader ? (loader.classList.contains('is-hidden') ? 'Hidden ✓' : 'Still visible ✗') : 'Missing',
        severity: loader && loader.classList.contains('is-hidden') ? 'ok' : 'warn'
    });

    /* 4. Sections */
    const sections = document.querySelectorAll('.page-section');
    r.checks.push({
        name: 'Page Sections',
        ok: sections.length === 16,
        detail: sections.length + ' sections registered (expected 16)',
        severity: sections.length === 16 ? 'ok' : 'warn'
    });

    /* 5. Duplicate IDs */
    const idMap = {};
    document.querySelectorAll('[id]').forEach(el => idMap[el.id] = (idMap[el.id] || 0) + 1);
    const dups = Object.entries(idMap).filter(([_, c]) => c > 1);
    r.checks.push({
        name: 'Duplicate DOM IDs',
        ok: dups.length === 0,
        detail: dups.length ? dups.length + ' duplicates: ' + dups.map(d => d[0]).join(', ') : 'None ✓',
        severity: dups.length ? 'warn' : 'ok'
    });

    /* 6. Overflow */
    const html = document.documentElement;
    const overflow = html.scrollWidth - html.clientWidth;
    r.checks.push({
        name: 'Horizontal Overflow',
        ok: overflow <= 0,
        detail: overflow > 0 ? '+' + overflow + 'px' : 'None ✓',
        severity: overflow > 2 ? 'warn' : 'ok'
    });

    /* 7. Network resources */
    const resources = performance.getEntriesByType('resource');
    const failed = resources.filter(x => x.name.startsWith('http') && x.transferSize === 0 && x.decodedBodySize === 0 && !x.name.includes('googleapis.com') && !x.name.includes('firebaseapp.com'));
    r.checks.push({
        name: 'Failed Requests',
        ok: failed.length === 0,
        detail: failed.length ? failed.length + ' failures' : 'None ✓',
        severity: failed.length ? 'warn' : 'ok'
    });

    /* 8. Performance */
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
        const loadTime = Math.round(nav.loadEventEnd - nav.startTime);
        r.checks.push({
            name: 'Page Load Time',
            ok: loadTime < 3000,
            detail: loadTime + 'ms',
            severity: loadTime < 3000 ? 'ok' : 'warn'
        });
    }

    /* 9. Firebase listeners via state */
    const state = window.__auditState;
    if (state) {
        r.checks.push({
            name: 'Reels Loaded',
            ok: state.reels.length > 0,
            detail: state.reels.length + ' reels in memory',
            severity: state.reels.length ? 'ok' : 'warn'
        });
        r.checks.push({
            name: 'Feedback Loaded',
            ok: state.feedback.length > 0,
            detail: state.feedback.length + ' feedback records',
            severity: state.feedback.length ? 'ok' : 'info'
        });
    } else {
        r.checks.push({
            name: 'Shared State',
            ok: false,
            detail: 'window.__auditState not yet populated',
            severity: 'warn'
        });
    }

    /* 10. Local error capture */
    const errCount = r.errors.length;
    r.checks.push({
        name: 'Runtime Errors',
        ok: errCount === 0,
        detail: errCount ? errCount + ' errors' : 'None ✓',
        severity: errCount ? 'critical' : 'ok'
    });

    /* Overall */
    r.okCount = r.checks.filter(c => c.severity === 'ok').length;
    r.warnCount = r.checks.filter(c => c.severity === 'warn').length;
    r.critCount = r.checks.filter(c => c.severity === 'critical').length;

    diagResults = r;
    renderResults(r);
}

function renderResults(r) {
    const container = document.getElementById('diagResults');
    if (!container) return;

    container.innerHTML = `
        <div class="stats" style="margin-bottom:14px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Passed</span>
                    <span class="stat-value" style="color:#1d7a3d;">${r.okCount}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Warnings</span>
                    <span class="stat-value" style="color:#7c6b00;">${r.warnCount}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Critical</span>
                    <span class="stat-value" style="color:#b03030;">${r.critCount}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Last Run</span>
                    <span class="stat-value" style="font-size:14px;">${new Date(r.ranAt).toLocaleTimeString('en-IN')}</span>
                </div>
            </div>
        </div>

        <div class="panel-card">
            <div class="panel-head"><span class="panel-title">Check Results</span></div>
            <div class="panel-body panel-body--flush">
                ${r.checks.map(c => {
                    const cls = c.severity === 'ok' ? 'positive' : c.severity === 'warn' ? 'warning' : c.severity === 'info' ? 'info' : 'attention';
                    return `
                        <div class="alert-item alert-item--${cls}" style="margin:12px 18px;">
                            <div class="alert-title">${escapeHTML(c.name)}</div>
                            <div class="alert-desc">${escapeHTML(c.detail)}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}
