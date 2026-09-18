/* ============================================================
   RUDRA BHAKTI — AUDIT: FIREBASE EXPLORER & CONTROL
   Browse, inspect, search, add, edit, delete nodes.
   ============================================================ */
import { db } from './firebase.js';
import { ref, get, set, remove, onValue, off } from "firebase/database";
import {
    escapeHTML, emptyBlock,
    paginate, renderPagination
} from './audit-charts.js';

let currentPath = '';
let liveData = null;
let liveUnsub = null;
let isLive = false;
let fbPage = 1;

export function init(state) {
    /* Bind once when module first loads */
    setTimeout(() => {
        const root = document.getElementById('auditFbGo');
        if (root && !root.dataset.bound) {
            root.dataset.bound = '1';
            root.addEventListener('click', () => {
                const input = document.getElementById('auditFbPath');
                if (input) navigateToPath(input.value.trim());
            });
        }
    }, 100);
}

export function render(state) {
    const el = document.getElementById('page-firebase');
    if (!el) return;

    if (!el.dataset.built) {
        el.dataset.built = '1';
        el.innerHTML = `
            <div class="section-head">
                <h2>Firebase Explorer</h2>
                <p>Browse, inspect, search, edit Firebase Realtime Database nodes.</p>
            </div>

            <div class="toolbar" style="margin-bottom:14px;">
                <div class="search" style="flex:1;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M12 2v20M2 12h20"/></svg>
                    <input type="text" id="auditFbPath" placeholder="Path (e.g. reels, feedback, adminNotifications)" value="" autocomplete="off" />
                </div>
                <button type="button" class="btn btn-primary" id="auditFbGo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span>Open</span>
                </button>
            </div>

            <div id="auditFbResults">
                <div class="panel-card"><div class="panel-body">${emptyBlock('Enter a path and click Open')}</div></div>
            </div>
        `;

        const input = document.getElementById('auditFbPath');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') navigateToPath(input.value.trim());
        });
    }

    if (liveData) renderData();
}

async function navigateToPath(path) {
    /* Cleanup previous live listener */
    if (liveUnsub) { try { liveUnsub(); } catch (e) {} liveUnsub = null; }
    isLive = false;

    currentPath = path.replace(/^\/+|\/+$/g, '');
    fbPage = 1;

    if (!currentPath) {
        const c = document.getElementById('auditFbResults');
        if (c) c.innerHTML = `<div class="panel-card"><div class="panel-body">${emptyBlock('Path is empty')}</div></div>`;
        return;
    }

    const container = document.getElementById('auditFbResults');
    if (container) container.innerHTML = `<div class="panel-card"><div class="panel-body">${emptyBlock('Loading ' + currentPath + '…')}</div></div>`;

    try {
        const snap = await get(ref(db, currentPath));
        if (!snap.exists()) {
            if (container) container.innerHTML = `<div class="panel-card"><div class="panel-body">${emptyBlock('No data at "' + currentPath + '"')}</div></div>`;
            liveData = null;
            return;
        }
        liveData = snap.val();
        renderData();
    } catch (err) {
        console.error('Firebase read error:', err);
        if (container) container.innerHTML = `<div class="panel-card"><div class="panel-body">${emptyBlock('Error: ' + err.message)}</div></div>`;
    }
}

function renderData() {
    const container = document.getElementById('auditFbResults');
    if (!container) return;

    const data = liveData;
    const isObject = data && typeof data === 'object' && !Array.isArray(data);
    const keys = isObject ? Object.keys(data) : [];
    const type = Array.isArray(data) ? 'array' : typeof data;
    const paged = isObject ? paginate(keys, fbPage, 5) : null;

    container.innerHTML = `
        <div class="panel-card" style="margin-bottom:14px;">
            <div class="panel-head">
                <span class="panel-title">Path: /${escapeHTML(currentPath)}</span>
                <span class="panel-meta">${isObject ? keys.length + ' children' : type}</span>
            </div>
            <div class="panel-body">
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
                    <button type="button" class="btn btn-ghost" id="fbAddBtn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
                        <span>Add Child</span>
                    </button>
                    <button type="button" class="btn btn-ghost" id="fbRefreshBtn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                        <span>Refresh</span>
                    </button>
                    <button type="button" class="btn btn-ghost" id="fbRawBtn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
                        <span>Toggle JSON</span>
                    </button>
                </div>

                ${isObject ? `
                    <div id="fbChildren">
                        ${paged.items.map(k => {
                            const v = data[k];
                            const vType = Array.isArray(v) ? 'array' : typeof v;
                            const preview = vType === 'object' ? `{${Object.keys(v || {}).length} children}` : String(v).slice(0, 60);
                            return `
                                <div class="reel-row" style="border-bottom:1px solid var(--border);">
                                    <div class="reel-row-main">
                                        <div class="reel-row-top">
                                            <span class="reel-row-id">${escapeHTML(k)}</span>
                                            <span class="reel-row-title">${escapeHTML(preview)}</span>
                                        </div>
                                        <div class="reel-row-url">${vType}</div>
                                    </div>
                                    <div class="reel-row-actions">
                                        ${vType === 'object' ? `
                                            <button type="button" class="reel-row-link" data-fb-open="${escapeHTML(currentPath + '/' + k)}">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                                                Open
                                            </button>
                                        ` : ''}
                                        <button type="button" class="reel-row-link" data-fb-edit="${escapeHTML(currentPath + '/' + k)}">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            Edit
                                        </button>
                                        <button type="button" class="reel-row-link" data-fb-del="${escapeHTML(currentPath + '/' + k)}" style="color:#b03030;">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/></svg>
                                            Del
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="pagination" id="fbPagination" hidden></div>
                ` : `
                    <div class="row-item">
                        <span class="row-item-label">Value</span>
                        <span class="row-item-value" style="font-family:monospace;">${escapeHTML(String(data))}</span>
                    </div>
                `}

                <pre id="fbRawJson" hidden style="background:var(--soft);padding:14px;border-radius:10px;overflow:auto;max-height:400px;font-size:12px;margin-top:14px;border:1px solid var(--border);">${escapeHTML(JSON.stringify(data, null, 2))}</pre>
            </div>
        </div>
    `;

    /* Bind actions */
    if (isObject && paged) {
        renderPagination('fbPagination', paged.page, paged.totalPages, (p) => {
            fbPage = p;
            renderData();
        });
    }

    /* Bind actions */
    container.querySelectorAll('[data-fb-open]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.fbOpen;
            const input = document.getElementById('auditFbPath');
            if (input) input.value = p;
            navigateToPath(p);
        });
    });

    container.querySelectorAll('[data-fb-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.fbEdit;
            const raw = JSON.stringify(getAtPath(data, p.split('/').slice(-1)[0]) ?? '', null, 2);
            const newVal = prompt('Edit value at /' + p + '\n\n(Enter JSON or raw value)', raw);
            if (newVal === null) return;
            let parsed;
            try { parsed = JSON.parse(newVal); } catch (e) { parsed = newVal; }
            saveNode(p, parsed);
        });
    });

    container.querySelectorAll('[data-fb-del]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.fbDel;
            if (!confirm('Delete /' + p + '?\n\nThis cannot be undone.')) return;
            deleteNode(p);
        });
    });

    const addBtn = document.getElementById('fbAddBtn');
    if (addBtn) addBtn.addEventListener('click', () => {
        const key = prompt('New child key (under /' + currentPath + '):');
        if (!key) return;
        const val = prompt('Value (JSON or raw):', '');
        if (val === null) return;
        let parsed;
        try { parsed = JSON.parse(val); } catch (e) { parsed = val; }
        saveNode(currentPath + '/' + key, parsed);
    });

    const refreshBtn = document.getElementById('fbRefreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => navigateToPath(currentPath));

    const rawBtn = document.getElementById('fbRawBtn');
    const rawEl = document.getElementById('fbRawJson');
    if (rawBtn && rawEl) rawBtn.addEventListener('click', () => {
        rawEl.hidden = !rawEl.hidden;
    });
}

function getAtPath(obj, key) {
    if (!obj || typeof obj !== 'object') return undefined;
    return obj[key];
}

async function saveNode(path, value) {
    try {
        await set(ref(db, path), value);
        alert('Saved: /' + path);
        navigateToPath(currentPath);
    } catch (err) {
        alert('Save failed: ' + err.message);
    }
}

async function deleteNode(path) {
    try {
        await remove(ref(db, path));
        alert('Deleted: /' + path);
        navigateToPath(currentPath);
    } catch (err) {
        alert('Delete failed: ' + err.message);
    }
}
