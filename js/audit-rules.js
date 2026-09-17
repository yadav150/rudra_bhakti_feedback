/* ============================================================
   RUDRA BHAKTI — AUDIT: FIREBASE RULES INSPECTOR
   Paste rules text → local analysis.
   ============================================================ */
import {
    escapeHTML, emptyBlock
} from './audit-charts.js';

const STORAGE_KEY = 'audit_rules_paste';

export function init(state) {}

export function render(state) {
    const el = document.getElementById('page-rules');
    if (!el) return;

    if (!el.dataset.built) {
        el.dataset.built = '1';
        el.innerHTML = `
            <div class="section-head">
                <h2>Firebase Rules Inspector</h2>
                <p>Paste your Firebase Realtime Database rules for analysis. Nothing is sent anywhere.</p>
            </div>

            <div class="panel-card" style="margin-bottom:14px;">
                <div class="panel-head">
                    <span class="panel-title">Rules (JSON)</span>
                    <span class="panel-meta">Stored locally in your browser</span>
                </div>
                <div class="panel-body">
                    <textarea id="rulesInput" style="width:100%;min-height:280px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--soft);color:var(--text);outline:none;" placeholder='{
  "rules": {
    "reels": { ".read": true, ".write": "auth != null" }
  }
}'></textarea>
                    <div style="display:flex;gap:8px;margin-top:12px;">
                        <button type="button" class="btn btn-primary" id="rulesAnalyzeBtn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                            <span>Analyze Rules</span>
                        </button>
                        <button type="button" class="btn btn-ghost" id="rulesClearBtn">
                            <span>Clear</span>
                        </button>
                    </div>
                </div>
            </div>

            <div id="rulesResults">
                <div class="panel-card"><div class="panel-body">${emptyBlock('Paste rules and click Analyze')}</div></div>
            </div>
        `;

        const ta = document.getElementById('rulesInput');
        ta.value = localStorage.getItem(STORAGE_KEY) || '';
        ta.addEventListener('input', () => {
            localStorage.setItem(STORAGE_KEY, ta.value);
        });

        document.getElementById('rulesAnalyzeBtn').addEventListener('click', analyze);
        document.getElementById('rulesClearBtn').addEventListener('click', () => {
            ta.value = '';
            localStorage.removeItem(STORAGE_KEY);
            document.getElementById('rulesResults').innerHTML = `<div class="panel-card"><div class="panel-body">${emptyBlock('Cleared')}</div></div>`;
        });
    }
}

function analyze() {
    const container = document.getElementById('rulesResults');
    const ta = document.getElementById('rulesInput');
    if (!container || !ta) return;

    const text = ta.value.trim();
    if (!text) {
        container.innerHTML = `<div class="panel-card"><div class="panel-body">${emptyBlock('No rules pasted')}</div></div>`;
        return;
    }

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        container.innerHTML = `
            <div class="panel-card">
                <div class="panel-body">
                    <div class="alert-item alert-item--attention">
                        <div class="alert-title">Invalid JSON</div>
                        <div class="alert-desc">${escapeHTML(e.message)}</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const findings = [];
    const paths = [];

    function walk(obj, prefix) {
        if (!obj || typeof obj !== 'object') return;
        Object.keys(obj).forEach(k => {
            const path = prefix ? prefix + '/' + k : k;
            const node = obj[k];
            if (k.startsWith('.')) {
                /* Rule key */
                paths.push(path);
                if (k === '.read' || k === '.write') {
                    const v = node;
                    if (v === true) {
                        findings.push({ severity: 'critical', title: `Open ${k} on /${prefix}`, detail: `${k} is set to true — anyone can access (even unauthenticated users).` });
                    } else if (typeof v === 'string' && v.includes('auth != null') && !v.includes('uid')) {
                        findings.push({ severity: 'info', title: `Broad auth on /${prefix}`, detail: `${k}: "${v}" — any authenticated user can access.` });
                    } else if (typeof v === 'string' && v.includes('uid')) {
                        findings.push({ severity: 'ok', title: `UID-gated on /${prefix}`, detail: `${k} is restricted to a specific UID.` });
                    }
                } else if (k.startsWith('.')) {
                    /* Other dot rules */
                    paths.push(path + '=' + k);
                }
            } else if (typeof node === 'object') {
                walk(node, path);
            }
        });
    }

    /* Start from .rules */
    if (parsed.rules) {
        walk(parsed.rules, '');
    } else {
        walk(parsed, '');
    }

    const counts = {
        critical: findings.filter(f => f.severity === 'critical').length,
        warn: findings.filter(f => f.severity === 'info').length,
        ok: findings.filter(f => f.severity === 'ok').length
    };

    container.innerHTML = `
        <div class="stats" style="margin-bottom:14px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Rule Paths</span>
                    <span class="stat-value">${paths.length}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Critical</span>
                    <span class="stat-value" style="color:#b03030;">${counts.critical}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Warnings</span>
                    <span class="stat-value" style="color:#7c6b00;">${counts.warn}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Secure Paths</span>
                    <span class="stat-value" style="color:#1d7a3d;">${counts.ok}</span>
                </div>
            </div>
        </div>

        <div class="panel-card">
            <div class="panel-head">
                <span class="panel-title">Findings</span>
                <span class="panel-meta">${findings.length} observations</span>
            </div>
            <div class="panel-body panel-body--flush">
                ${findings.length ? findings.map(f => {
                    const cls = f.severity === 'critical' ? 'attention' : f.severity === 'info' ? 'warning' : 'positive';
                    return `
                        <div class="alert-item alert-item--${cls}" style="margin:12px 18px;">
                            <div class="alert-title">${escapeHTML(f.title)}</div>
                            <div class="alert-desc">${escapeHTML(f.detail)}</div>
                        </div>
                    `;
                }).join('') : emptyBlock('No findings')}
            </div>
        </div>
    `;
}
