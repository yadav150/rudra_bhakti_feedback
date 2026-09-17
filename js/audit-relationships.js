/* ============================================================
   RUDRA BHAKTI — AUDIT: RELATIONSHIP EXPLORER
   Trace: Reel → Feedback → Fields → Options
   ============================================================ */
import {
    escapeHTML, emptyBlock
} from './audit-charts.js';

let selectedReelId = null;

export function init(state) {}

export function render(state) {
    window.__auditState = state;
    const el = document.getElementById('page-relationships');
    if (!el) return;

    if (!el.dataset.built) {
        el.dataset.built = '1';
        el.innerHTML = `
            <div class="section-head">
                <h2>Relationship Explorer</h2>
                <p>Trace full data chain: Reel → Feedback → Option → Field.</p>
            </div>

            <div class="panel-card" style="margin-bottom:14px;">
                <div class="panel-head"><span class="panel-title">Select a Reel</span></div>
                <div class="panel-body">
                    <div id="relReelChips" class="compare-select"></div>
                </div>
            </div>

            <div id="relResult"></div>
        `;
    }

    renderReelChips(state);
    renderTree(state);
}

function renderReelChips(state) {
    const container = document.getElementById('relReelChips');
    if (!container) return;
    const reels = (state && state.reels) || [];

    if (!reels.length) {
        container.innerHTML = `<div style="color:var(--muted);font-size:13px;">No reels available</div>`;
        return;
    }

    container.innerHTML = reels.map(r => `
        <button type="button" class="compare-chip${selectedReelId === r.id ? ' is-active' : ''}" data-id="${escapeHTML(r.id)}">
            ${escapeHTML(r.id)}
        </button>
    `).join('');

    container.querySelectorAll('.compare-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedReelId = btn.dataset.id;
            renderReelChips(window.__auditState);
            renderTree(window.__auditState);
        });
    });
}

function renderTree(state) {
    const container = document.getElementById('relResult');
    if (!container) return;

    const reels = (state && state.reels) || [];
    const feedback = (state && state.feedback) || [];

    if (!selectedReelId) {
        container.innerHTML = `<div class="panel-card"><div class="panel-body">${emptyBlock('Select a reel to trace its data chain')}</div></div>`;
        return;
    }

    const reel = reels.find(r => r.id === selectedReelId);
    if (!reel) {
        container.innerHTML = `<div class="panel-card"><div class="panel-body">${emptyBlock('Reel not found')}</div></div>`;
        return;
    }

    const items = feedback.filter(f => f.reelId === selectedReelId);

    /* ---- Trace each feedback ---- */
    const treeHTML = items.length ? items.map((f, idx) => {
        const fields = ['feeling','more','rating','wantMore','engageAgain','message'];
        const nonEmpty = fields.filter(k => {
            const v = f[k];
            return v != null && String(v).trim() !== '';
        });

        return `
            <div class="panel-card" style="margin-top:14px;">
                <div class="panel-head">
                    <span class="panel-title">Response #${idx + 1} — ${escapeHTML(f.id.slice(0, 12))}…</span>
                    <span class="panel-meta">${f.submittedAt ? new Date(f.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                </div>
                <div class="panel-body">
                    <div class="rel-tree">
                        <div class="rel-node rel-node--reel">
                            <span class="rel-label">Reel</span>
                            <span class="rel-id">${escapeHTML(f.reelId || '')}</span>
                            <span class="rel-value">${escapeHTML((f.reelTitle || reel.title || '').slice(0, 60))}</span>
                        </div>
                        <div class="rel-connector"></div>
                        <div class="rel-node rel-node--response">
                            <span class="rel-label">Response ID</span>
                            <span class="rel-id">${escapeHTML(f.id)}</span>
                            <span class="rel-value">${escapeHTML(f.name || 'Anonymous')}</span>
                        </div>
                        <div class="rel-connector"></div>
                        <div class="rel-branches">
                            ${nonEmpty.map(k => `
                                <div class="rel-branch">
                                    <span class="rel-field">${escapeHTML(k)}</span>
                                    <span class="rel-field-value">${escapeHTML(String(f[k]).slice(0, 80))}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('') : emptyBlock('No feedback records for this reel');

    container.innerHTML = `
        <div class="panel-card">
            <div class="panel-head">
                <span class="panel-title">Data Chain: ${escapeHTML(reel.id)}</span>
                <span class="panel-meta">${items.length} response${items.length === 1 ? '' : 's'}</span>
            </div>
            <div class="panel-body">
                <div style="font-size:13px;color:var(--muted);line-height:1.6;">
                    <strong style="color:var(--text);">${escapeHTML(reel.title || '')}</strong><br>
                    Added: ${reel.createdAt ? new Date(reel.createdAt).toLocaleString('en-IN') : '—'}
                </div>
            </div>
        </div>
        ${treeHTML}
    `;
}
