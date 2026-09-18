/* ============================================================
   RUDRA BHAKTI — AUDIT: SETTINGS
   Groq API key + display preferences.
   ============================================================ */
import { db } from './firebase.js';
import { ref, get, set } from "firebase/database";
import {
    escapeHTML, emptyBlock
} from './audit-charts.js';

function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
}

export function init(state) {}

export function render(state) {
    const el = document.getElementById('page-settings');
    if (!el) return;

    if (!el.dataset.built) {
        el.dataset.built = '1';
        el.innerHTML = `
            <div class="section-head">
                <h2>Settings</h2>
                <p>Configuration for audit modules and chatbot.</p>
            </div>

            <div class="panel-card" style="margin-bottom:14px;">
                <div class="panel-head"><span class="panel-title">Groq API Key (Chatbot)</span></div>
                <div class="panel-body">
                    <p style="font-size:13px;color:var(--muted);margin:0 0 12px;line-height:1.6;">
                        Store your Groq API key here. It will be saved to Firebase under <code>adminSettings/groqKey</code> and used by the chatbot. Get a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener" style="color:var(--accent);">console.groq.com/keys</a>.
                    </p>
                    <div class="field">
                        <label for="groqKeyInput">Groq API Key</label>
                        <input type="password" id="groqKeyInput" placeholder="gsk_..." autocomplete="off" />
                    </div>
                    <div style="display:flex;gap:8px;margin-top:12px;">
                        <button type="button" class="btn btn-primary" id="saveGroqBtn">Save Key</button>
                        <button type="button" class="btn btn-ghost" id="clearGroqBtn">Clear</button>
                    </div>
                    <div id="groqStatus" style="margin-top:10px;font-size:12px;color:var(--muted);"></div>
                </div>
            </div>

            <div class="panel-card" style="margin-bottom:14px;">
                <div class="panel-head"><span class="panel-title">Display Preferences</span></div>
                <div class="panel-body">
                    <div class="field" style="margin-bottom:14px;">
                        <label for="prefTheme">Theme</label>
                        <select id="prefTheme" class="select" style="width:100%;">
                            <option value="light">Light (default)</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                    <div class="field" style="margin-bottom:14px;">
                        <label for="prefRefresh">Auto-Refresh (ms)</label>
                        <input type="number" id="prefRefresh" value="120" min="50" max="2000" step="10" />
                    </div>
                    <button type="button" class="btn btn-primary" id="savePrefsBtn">Save Preferences</button>
                </div>
            </div>

            <div class="panel-card">
                <div class="panel-head"><span class="panel-title">Firebase Status</span></div>
                <div class="panel-body">
                    <div id="fbStatus">${emptyBlock('Checking…')}</div>
                </div>
            </div>
        `;

        document.getElementById('saveGroqBtn').addEventListener('click', saveGroqKey);
        document.getElementById('clearGroqBtn').addEventListener('click', clearGroqKey);
        document.getElementById('savePrefsBtn').addEventListener('click', savePrefs);
    }

    loadGroqKey();
    loadPrefs();
    checkFirebaseStatus();
}

async function loadGroqKey() {
    const input = document.getElementById('groqKeyInput');
    const status = document.getElementById('groqStatus');
    if (!input || !status) return;
    try {
        const snap = await get(ref(db, 'adminSettings/groqKey'));
        if (snap.exists()) {
            input.value = snap.val();
            status.textContent = '✓ Key loaded from Firebase';
            status.style.color = '#1d7a3d';
        } else {
            status.textContent = 'No key saved yet';
            status.style.color = '';
        }
    } catch (err) {
        status.textContent = 'Could not load: ' + err.message;
        status.style.color = '#b03030';
    }
}

async function saveGroqKey() {
    const input = document.getElementById('groqKeyInput');
    const status = document.getElementById('groqStatus');
    if (!input || !status) return;

    const v = input.value.trim();
    if (!v) {
        status.textContent = 'Enter a key first';
        status.style.color = '#b03030';
        return;
    }

    status.textContent = 'Saving…';
    status.style.color = '';
    try {
        await set(ref(db, 'adminSettings/groqKey'), v);
        status.textContent = '✓ Saved';
        status.style.color = '#1d7a3d';
    } catch (err) {
        status.textContent = 'Save failed: ' + err.message;
        status.style.color = '#b03030';
    }
}

async function clearGroqKey() {
    const input = document.getElementById('groqKeyInput');
    const status = document.getElementById('groqStatus');
    if (!confirm('Clear stored Groq API key?')) return;
    try {
        await set(ref(db, 'adminSettings/groqKey'), null);
        if (input) input.value = '';
        if (status) {
            status.textContent = 'Key cleared';
            status.style.color = '';
        }
    } catch (err) {
        if (status) {
            status.textContent = 'Clear failed: ' + err.message;
            status.style.color = '#b03030';
        }
    }
}

async function loadPrefs() {
    try {
        const snap = await get(ref(db, 'adminSettings/prefs'));
        if (snap.exists()) {
            const p = snap.val();
            const theme = document.getElementById('prefTheme');
            const refresh = document.getElementById('prefRefresh');
            if (theme && p.theme) theme.value = p.theme;
            if (refresh && p.refreshMs) refresh.value = p.refreshMs;
            if (p.theme) applyTheme(p.theme);
        }
    } catch (err) { /* silent */ }
}

async function savePrefs() {
    const theme = document.getElementById('prefTheme')?.value || 'light';
    const refreshMs = Number(document.getElementById('prefRefresh')?.value || 120);
    try {
        await set(ref(db, 'adminSettings/prefs'), { theme, refreshMs });
        applyTheme(theme);
        alert('Preferences saved');
    } catch (err) {
        alert('Save failed: ' + err.message);
    }
}

async function checkFirebaseStatus() {
    const el = document.getElementById('fbStatus');
    if (!el) return;
    el.innerHTML = `<div style="font-size:13px;color:var(--muted);">Testing…</div>`;
    try {
        const t0 = performance.now();
        const snap = await get(ref(db, 'reels'));
        const ms = Math.round(performance.now() - t0);
        const count = snap.size;
        el.innerHTML = `
            <div style="display:grid;gap:8px;font-size:13px;">
                <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:140px;">Connection</span><span style="color:#1d7a3d;">✓ Reachable</span></div>
                <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:140px;">Read Latency</span><span>${ms}ms</span></div>
                <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:140px;">Reels Node</span><span>${count} entries</span></div>
            </div>
        `;
    } catch (err) {
        el.innerHTML = `<div style="color:#b03030;font-size:13px;">Error: ${escapeHTML(err.message)}</div>`;
    }
}
