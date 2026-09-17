/* ============================================================
   RUDRA BHAKTI — FEEDBACK SECTION
   ============================================================ */
import { db } from './firebase.js';
import { ref, onValue } from "firebase/database";

const FEEDBACK_PER_PAGE = 10;

let allFeedback = [];
let unsubFeedback = null;
let feedbackPage = 1;
let started = false;

/* ============================================================
   INIT
   ============================================================ */
export function init() {
    if (started) return;
    started = true;

    bindFilters();

    unsubFeedback = onValue(ref(db, 'feedback'), (snap) => {
        allFeedback = [];
        snap.forEach((child) => {
            const v = child.val() || {};
            allFeedback.push({
                id: child.key,
                ...v,
                isAnonymous: typeof v.isAnonymous === 'boolean'
                    ? v.isAnonymous
                    : (!v.name || v.name === 'Anonymous' || /^Anonymous \(/.test(v.name || ''))
            });
        });
        render();
        window.markReady && window.markReady();
    }, (err) => {
        console.error('Feedback listener error:', err);
        window.markReady && window.markReady();
    });
}

export function render() {
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
   FILTER
   ============================================================ */
function getFiltered() {
    let list = [...allFeedback];

    const searchInput = document.getElementById('searchInput');
    const filterRating = document.getElementById('filterRating');
    const filterDate = document.getElementById('filterDate');
    const sortBy = document.getElementById('sortBy');

    const q = (searchInput?.value || '').trim().toLowerCase();
    if (q) {
        list = list.filter((f) =>
            (f.name || '').toLowerCase().includes(q) ||
            (f.email || '').toLowerCase().includes(q) ||
            (f.message || '').toLowerCase().includes(q) ||
            (f.reelId || '').toLowerCase().includes(q) ||
            (f.reelTitle || '').toLowerCase().includes(q)
        );
    }

    const r = filterRating?.value || 'all';
    if (r === '4plus') list = list.filter((f) => Number(f.rating) >= 4);
    else if (r !== 'all') list = list.filter((f) => Number(f.rating) === Number(r));

    const d = filterDate?.value || 'all';
    if (d !== 'all') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = { today: 0, '7d': 7, '30d': 30 }[d];
        if (d === 'today') list = list.filter((f) => new Date(f.submittedAt) >= start);
        else if (diffDays) {
            const cutoff = new Date(now.getTime() - diffDays * 24 * 60 * 60 * 1000);
            list = list.filter((f) => new Date(f.submittedAt) >= cutoff);
        }
    }

    const s = sortBy?.value || 'newest';
    list.sort((a, b) => {
        if (s === 'newest') return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
        if (s === 'oldest') return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
        if (s === 'highest') return Number(b.rating) - Number(a.rating);
        if (s === 'lowest') return Number(a.rating) - Number(b.rating);
        return 0;
    });

    return list;
}

/* ============================================================
   RENDER LIST
   ============================================================ */
function renderList() {
    const feedbackList = document.getElementById('feedbackList');
    const resultCount = document.getElementById('resultCount');
    if (!feedbackList) return;

    const list = getFiltered();
    if (resultCount) resultCount.textContent = list.length + ' result' + (list.length === 1 ? '' : 's');

    if (!list.length) {
        feedbackList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                </div>
                <h3>No feedback found</h3>
                <p>Try adjusting filters, or feedback will appear here once users start responding.</p>
            </div>
        `;
        const pg = document.getElementById('feedbackPagination');
        if (pg) pg.hidden = true;
        return;
    }

    const totalPages = Math.max(1, Math.ceil(list.length / FEEDBACK_PER_PAGE));
    if (feedbackPage > totalPages) feedbackPage = totalPages;
    if (feedbackPage < 1) feedbackPage = 1;

    const start = (feedbackPage - 1) * FEEDBACK_PER_PAGE;
    const pageItems = list.slice(start, start + FEEDBACK_PER_PAGE);

    feedbackList.innerHTML = pageItems.map(renderRow).join('');

    renderPagination('feedbackPagination', feedbackPage, totalPages, (p) => {
        feedbackPage = p;
        renderList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function renderRow(f) {
    const safe = (v) => escapeHTML(v == null ? '' : String(v));
    const dateStr = formatDate(f.submittedAt);
    return `
        <article class="row">
            <div class="row-top">
                <span class="row-name">${safe(f.name || 'Anonymous')}</span>
                ${!f.isAnonymous
                    ? `<span class="row-email">${safe(f.email)}</span>`
                    : `<span class="row-anon">Anonymous</span>`}
                <span class="row-rating">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1z"/>
                    </svg>
                    ${safe(f.rating)} / 5
                </span>
            </div>
            <div class="row-grid">
                ${item('Reel', f.reelId ? f.reelId + ' — ' + (f.reelTitle || '') : null)}
                ${item('Feeling', f.feeling)}
                ${item('Would watch more', f.more || f.wouldWatchMore)}
                ${item('Wants more of', f.wantMore)}
                ${item('Engage again', f.engageAgain)}
                ${item('Connected with', f.connectedWith)}
                ${item('Stood out', f.stoodOut)}
                ${item('Held interest', f.heldInterest)}
                ${item('Presentation', f.presentation)}
                ${item('Improve', f.improve)}
                ${item('Liked part', f.likedPart)}
                ${f.message ? `
                    <div class="row-item row-message">
                        <span class="row-item-label">Message</span>
                        <span class="row-item-value">${safe(f.message)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="row-foot">
                <span>Submitted: ${safe(dateStr)}</span>
                <span>ID: ${safe(f.id)}</span>
            </div>
        </article>
    `;
}

function item(label, value) {
    if (!value) return '';
    return `
        <div class="row-item">
            <span class="row-item-label">${escapeHTML(label)}</span>
            <span class="row-item-value">${escapeHTML(value)}</span>
        </div>
    `;
}

/* ============================================================
   BIND FILTERS
   ============================================================ */
function bindFilters() {
    ['searchInput', 'filterRating', 'filterDate', 'sortBy'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
            feedbackPage = 1;
            renderList();
        });
    });
}
