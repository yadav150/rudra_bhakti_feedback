/* ============================================================
   RUDRA BHAKTI — AUDIT: AUTHENTICATION AUDIT
   Current user, session, admin config.
   ============================================================ */
import { auth, ADMIN_UID } from './firebase.js';
import {
    escapeHTML, emptyBlock
} from './audit-charts.js';

export function init(state) {}

export function render(state) {
    const el = document.getElementById('page-auth');
    if (!el) return;

    const user = auth.currentUser;
    const isAuthorized = user && user.uid === ADMIN_UID;

    /* Count auth events from auditLog */
    const log = (state && state.auditLog) || [];
    const authEvents = log.filter(e => {
        const a = (e.action || '').toLowerCase();
        return a === 'login' || a === 'logout';
    });

    el.innerHTML = `
        <div class="section-head">
            <h2>Authentication Audit</h2>
            <p>Current session, authorization state, and login history.</p>
        </div>

        <div class="stats" style="margin-bottom:18px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Session Status</span>
                    <span class="stat-value" style="font-size:18px;color:${user ? '#1d7a3d' : '#b03030'};">${user ? 'ACTIVE' : 'NONE'}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Authorization</span>
                    <span class="stat-value" style="font-size:18px;color:${isAuthorized ? '#1d7a3d' : '#b03030'};">${isAuthorized ? 'AUTHORIZED' : 'DENIED'}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Auth Events Logged</span>
                    <span class="stat-value">${authEvents.length}</span>
                </div>
            </div>
        </div>

        <div class="panel-card" style="margin-bottom:14px;">
            <div class="panel-head"><span class="panel-title">Current User</span></div>
            <div class="panel-body">
                ${user ? `
                    <div style="display:grid;gap:10px;font-size:13px;">
                        <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:120px;">Email</span><span>${escapeHTML(user.email || '—')}</span></div>
                        <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:120px;">UID</span><span style="font-family:monospace;font-size:12px;word-break:break-all;">${escapeHTML(user.uid)}</span></div>
                        <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:120px;">Email Verified</span><span>${user.emailVerified ? '✓ Yes' : '✗ No'}</span></div>
                        <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:120px;">Matches ADMIN_UID</span><span>${user.uid === ADMIN_UID ? '✓ Yes' : '✗ No'}</span></div>
                        <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:120px;">Last Sign-In</span><span>${user.metadata?.lastSignInTime || '—'}</span></div>
                        <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:120px;">Created</span><span>${user.metadata?.creationTime || '—'}</span></div>
                    </div>
                ` : emptyBlock('No user signed in')}
            </div>
        </div>

        <div class="panel-card" style="margin-bottom:14px;">
            <div class="panel-head"><span class="panel-title">Admin Configuration</span></div>
            <div class="panel-body">
                <div style="display:grid;gap:10px;font-size:13px;">
                    <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:180px;">Authorized Admin UID</span><span style="font-family:monospace;font-size:12px;word-break:break-all;">${escapeHTML(ADMIN_UID)}</span></div>
                    <div style="display:flex;gap:12px;"><span style="color:var(--muted);min-width:180px;">Access Path</span><span>${isAuthorized ? 'Full admin access granted' : 'Restricted — will redirect on next check'}</span></div>
                </div>
            </div>
        </div>

        <div class="panel-card">
            <div class="panel-head">
                <span class="panel-title">Recent Auth Events</span>
                <span class="panel-meta">${authEvents.length} logged</span>
            </div>
            <div class="panel-body panel-body--flush">
                ${authEvents.length ? authEvents.slice(0, 30).map(e => `
                    <div class="intel-row">
                        <div class="intel-head">
                            <span class="intel-label intel-label--${(e.action || '').toLowerCase() === 'login' ? 'high' : 'attention'}">${escapeHTML((e.action || '').toUpperCase())}</span>
                            <span class="intel-title">${escapeHTML((e.user || '').slice(0, 40))}</span>
                        </div>
                        <div class="intel-metrics">
                            <div class="intel-metric"><div class="intel-metric-label">Time</div><div class="intel-metric-value">${e.ts ? new Date(e.ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</div></div>
                        </div>
                    </div>
                `).join('') : emptyBlock('No auth events logged yet (write-hooks activate in Batch 7)')}
            </div>
        </div>
    `;
}
