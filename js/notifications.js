/* ============================================================
   RUDRA BHAKTI — NOTIFICATIONS SECTION
   ============================================================ */
import { db } from './firebase.js';
import { ref, onValue, set, update } from "firebase/database";

const BASE_TITLE = 'Admin — Rudra Bhakti';
const PER_PAGE = 15;

let allFeedback = [];
let savedReels = [];
let readIds = new Set();
let unsubFeedback = null;
let unsubReels = null;
let unsubRead = null;
let firstFeedbackSnapshot = true;
let lastMaxTs = 0;
let currentPage = 1;
let started = false;

/* ============================================================
   INIT
   ============================================================ */
export function init() {
    if (started) return;
    started = true;

    bindToolbar();

    unsubReels = onValue(ref(db, 'reels'), (snap) => {
        savedReels = [];
        snap.forEach((child) => {
            savedReels.push({ id: child.key, ...child.val() });
        });
        render();
    }, (err) => console.error('Reels listener error:', err));

    unsubFeedback = onValue(ref(db, 'feedback'), (snap) => {
        const items = [];
        let maxTs = 0;
        snap.forEach((child) => {
            const v = child.val() || {};
            items.push({ id: child.key, ...v });
            const ts = Number(v.submittedAt) || 0;
            if (ts > maxTs) maxTs = ts;
        });

        if (!firstFeedbackSnapshot && maxTs > lastMaxTs) {
            playBeep();
        }
        lastMaxTs = maxTs;
        firstFeedbackSnapshot = false;

        items.sort((a, b) => (Number(b.submittedAt) || 0) - (Number(a.submittedAt) || 0));
        allFeedback = items;
        render();
        window.markReady && window.markReady();
    }, (err) => {
        console.error('Feedback listener error:', err);
        window.markReady && window.markReady();
    });

    unsubRead = onValue(ref(db, 'adminNotifications/readIds'), (snap) => {
        readIds = new Set();
        if (snap.exists()) {
            snap.forEach((child) => {
                readIds.add(child.key);
            });
        }
        render();
    }, (err) => console.error('ReadIds listener error:', err));
}

export function render() {
    updateTitle();
    updateStats();
    renderList();
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHTML(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function formatDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}
function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - Number(ts);
    if (diff < 0) return 'just now';
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return hrs + ' hr' + (hrs === 1 ? '' : 's') + ' ago';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + ' day' + (days === 1 ? '' : 's') + ' ago';
    return formatDate(ts);
}
function getReelTitle(feedback) {
    if (feedback.reelTitle) return feedback.reelTitle;
    const reel = savedReels.find((r) => r.id === feedback.reelId);
    return reel && reel.title ? reel.title : '';
}

/* ============================================================
   AUDIO BEEP
   ============================================================ */
let audioCtx = null;
function ensureAudio() {
    if (audioCtx) return audioCtx;
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
    } catch (e) {
        return null;
    }
    return audioCtx;
}
function playBeep() {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1175, now + 0.12);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) { /* silent */ }
}
document.addEventListener('click', () => {
    const ctx = ensureAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}, { passive: true });

/* ============================================================
   TITLE / STATS
   ============================================================ */
function updateTitle() {
    /* Only show count in title if this section is active */
    const active = document.querySelector('#page-notifications:not([hidden])');
    if (!active) {
        document.title = BASE_TITLE;
        return;
    }
    const unread = countUnread();
    document.title = unread > 0 ? '(' + unread + ') Notifications — Rudra Bhakti' : 'Notifications — Rudra Bhakti';
}
function countUnread() {
    let n = 0;
    allFeedback.forEach((f) => { if (!readIds.has(f.id)) n++; });
    return n;
}
function updateStats() {
    const notifCount = document.getElementById('notifCount');
    const notifUnread = document.getElementById('notifUnread');
    const total = allFeedback.length;
    const unread = countUnread();
    if (notifCount) notifCount.textContent = total + ' notification' + (total === 1 ? '' : 's');
    if (notifUnread) notifUnread.textContent = unread + ' unread';
}

/* ============================================================
   FILTER
   ============================================================ */
function getFiltered() {
    let list = [...allFeedback];
    const filterNotif = document.getElementById('filterNotif');
    const f = filterNotif?.value || 'all';
    if (f === 'unread') {
        list = list.filter((x) => !readIds.has(x.id));
    } else if (f === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        list = list.filter((x) => new Date(x.submittedAt).getTime() >= today.getTime());
    } else if (f === '7d') {
        const cutoff = Date.now() - 7 * 864e5;
        list = list.filter((x) => new Date(x.submittedAt).getTime() >= cutoff);
    }
    return list;
}

/* ============================================================
   RENDER LIST
   ============================================================ */
function renderList() {
    const notifList = document.getElementById('notifList');
    const notifEmpty = document.getElementById('notifEmpty');
    const notifEmptyTitle = document.getElementById('notifEmptyTitle');
    const notifEmptyText = document.getElementById('notifEmptyText');
    if (!notifList || !notifEmpty) return;

    const list = getFiltered();

    if (!list.length) {
        notifList.hidden = true;
        notifList.innerHTML = '';
        notifEmpty.hidden = false;
        const f = document.getElementById('filterNotif')?.value || 'all';
        if (allFeedback.length === 0) {
            notifEmptyTitle.textContent = 'No notifications yet';
            notifEmptyText.textContent = 'Notifications will appear here whenever feedback is submitted.';
        } else if (f === 'unread') {
            notifEmptyTitle.textContent = 'All caught up';
            notifEmptyText.textContent = 'You have read every notification.';
        } else {
            notifEmptyTitle.textContent = 'No notifications in this filter';
            notifEmptyText.textContent = 'Try a different filter to see more notifications.';
        }
        const pg = document.getElementById('notifPagination');
        if (pg) pg.hidden = true;
        return;
    }

    notifEmpty.hidden = true;
    notifList.hidden = false;

    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * PER_PAGE;
    const items = list.slice(start, start + PER_PAGE);

    notifList.innerHTML = items.map(renderNotif).join('');

    notifList.querySelectorAll('[data-notif-id]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.dataset.notifId;
            if (id && !readIds.has(id)) markRead(id);
        });
    });

    notifList.querySelectorAll('[data-see-more]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.seeMore;
            if (!id) return;
            if (!readIds.has(id)) markRead(id);
            window.navigateTo && window.navigateTo('feedback-view', { id });
        });
    });

    renderPagination('notifPagination', currentPage, totalPages, (p) => {
        currentPage = p;
        renderList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function renderNotif(f) {
    const isUnread = !readIds.has(f.id);
    const reelLabel = f.reelId ? ('New feedback on ' + f.reelId) : 'New feedback';
    const reelTitle = getReelTitle(f);
    const rating = Number(f.rating) || 0;
    const safe = (v) => escapeHTML(v == null ? '' : String(v));

    const fromVal = safe(f.name || 'Anonymous');
    const messageVal = (f.message || '').trim();

    const metaItems = [];
    if (f.feeling) metaItems.push(rowItem('Feeling', safe(f.feeling)));
    if (f.more) metaItems.push(rowItem('Would watch more', safe(f.more)));
    metaItems.push(rowItem('Rating', safe(rating) + ' / 5'));
    if (f.wantMore) metaItems.push(rowItem('Wants more of', safe(f.wantMore)));
    if (f.engageAgain) metaItems.push(rowItem('Engage again', safe(f.engageAgain)));
    metaItems.push(rowItem('From', fromVal));

    return `
        <article class="row notif-row${isUnread ? ' is-unread' : ''}"
                 data-notif-id="${safe(f.id)}"
                 role="button"
                 tabindex="0">
            <div class="row-top">
                <span class="notif-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                </span>
                <div class="notif-titles">
                    <span class="row-name">${safe(reelLabel)}</span>
                    ${reelTitle ? `<span class="notif-sub">${safe(reelTitle)}</span>` : ''}
                </div>
                ${isUnread ? '<span class="notif-new">New</span>' : ''}
            </div>
            <div class="row-grid">
                ${metaItems.join('')}
                ${messageVal ? `
                    <div class="row-item row-message">
                        <span class="row-item-label">Message</span>
                        <span class="row-item-value">${safe(messageVal)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="row-foot">
                <span>${safe(timeAgo(f.submittedAt))}</span>
                <span>${safe(formatDate(f.submittedAt))}</span>
            </div>
            <button type="button" class="btn btn-ghost" data-see-more="${safe(f.id)}" style="align-self:flex-start;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                <span>See more</span>
            </button>
        </article>
    `;
}

function rowItem(label, value) {
    return `
        <div class="row-item">
            <span class="row-item-label">${escapeHTML(label)}</span>
            <span class="row-item-value">${escapeHTML(value)}</span>
        </div>
    `;
}

function renderPagination(containerId, current, total, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (total <= 1) {
        container.hidden = true;
        container.innerHTML = '';
        return;
    }
    container.hidden = false;
    container.innerHTML = `
        <button type="button" class="pg-btn" data-pg="prev" ${current === 1 ? 'disabled' : ''}>Prev</button>
        <span class="pg-info">Page ${current} of ${total}</span>
        <button type="button" class="pg-btn" data-pg="next" ${current === total ? 'disabled' : ''}>Next</button>
    `;
    const prev = container.querySelector('[data-pg="prev"]');
    const next = container.querySelector('[data-pg="next"]');
    if (prev) prev.addEventListener('click', () => onChange(current - 1));
    if (next) next.addEventListener('click', () => onChange(current + 1));
}

/* ============================================================
   MARK READ
   ============================================================ */
async function markRead(id) {
    if (!id || readIds.has(id)) return;
    try {
        await set(ref(db, 'adminNotifications/readIds/' + id), Date.now());
    } catch (err) {
        console.error('Mark read failed:', err);
    }
}
async function markAllRead() {
    const unread = allFeedback.filter((f) => !readIds.has(f.id));
    if (!unread.length) return;
    const updates = {};
    const stamp = Date.now();
    unread.forEach((f) => {
        updates['adminNotifications/readIds/' + f.id] = stamp;
    });
    const btn = document.getElementById('markAllRead');
    if (btn) btn.disabled = true;
    try {
        await update(ref(db), updates);
    } catch (err) {
        console.error('Mark all read failed:', err);
    } finally {
        if (btn) btn.disabled = false;
    }
}

/* ============================================================
   BINDINGS
   ============================================================ */
function bindToolbar() {
    const filterNotif = document.getElementById('filterNotif');
    const markAllReadBtn = document.getElementById('markAllRead');
    if (filterNotif) {
        filterNotif.addEventListener('change', () => {
            currentPage = 1;
            renderList();
        });
    }
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllRead);
    }
}
