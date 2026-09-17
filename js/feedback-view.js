/* ============================================================
   RUDRA BHAKTI — FEEDBACK VIEW SECTION
   ============================================================ */
import { db } from './firebase.js';
import { ref, get, set } from "firebase/database";

const TARGET_WIDTH = 3840;

let currentFeedback = null;
let savedReels = [];
let unsubReels = null;
let started = false;
let lastLoadedId = null;

/* ============================================================
   INIT
   ============================================================ */
export function init() {
    if (started) return;
    started = true;

    bindActions();
}

export function render(params = {}) {
    const id = params.id || '';
    if (!id) {
        showError('No feedback selected', 'Please open this from a notification.');
        return;
    }
    if (id === lastLoadedId) {
        /* Already loaded — just re-show */
        return;
    }
    lastLoadedId = id;
    loadFeedback(id);
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
function getReelTitle(f) {
    if (f.reelTitle) return f.reelTitle;
    const reel = savedReels.find((r) => r.id === f.reelId);
    return reel && reel.title ? reel.title : '';
}

/* ============================================================
   LOAD
   ============================================================ */
async function loadFeedback(id) {
    const errorCard = document.getElementById('errorCard');
    const viewWrap = document.getElementById('viewWrap');
    const captureReel = document.getElementById('captureReel');
    const captureRating = document.getElementById('captureRating');
    const captureGrid = document.getElementById('captureGrid');
    const captureMessage = document.getElementById('captureMessage');
    const captureMessageText = document.getElementById('captureMessageText');
    const captureDate = document.getElementById('captureDate');
    const viewMeta = document.getElementById('viewMeta');
    const shareStatus = document.getElementById('shareStatus');

    /* Reset to loading */
    if (errorCard) errorCard.hidden = true;
    if (viewWrap) viewWrap.hidden = true;
    if (shareStatus) shareStatus.hidden = true;
    if (captureReel) captureReel.innerHTML = '';
    if (captureRating) captureRating.innerHTML = '';
    if (captureGrid) captureGrid.innerHTML = '';
    if (captureMessage) captureMessage.hidden = true;
    if (viewMeta) viewMeta.textContent = 'Loading…';

    /* Mark as read */
    try {
        await set(ref(db, 'adminNotifications/readIds/' + id), Date.now());
    } catch (err) { /* silent */ }

    try {
        const [feedbackSnap, reelsSnap] = await Promise.all([
            get(ref(db, 'feedback/' + id)),
            get(ref(db, 'reels'))
        ]);

        if (!feedbackSnap.exists()) {
            showError('Feedback not found', 'This response may have been removed.');
            return;
        }

        savedReels = [];
        reelsSnap.forEach((child) => {
            savedReels.push({ id: child.key, ...child.val() });
        });

        currentFeedback = { id, ...feedbackSnap.val() };
        renderView(currentFeedback);
    } catch (err) {
        console.error('Load error:', err);
        showError('Unable to load feedback', 'Please check your connection and try again.');
    }
}

function showError(title, text) {
    const errorCard = document.getElementById('errorCard');
    const viewWrap = document.getElementById('viewWrap');
    const errorTitle = document.getElementById('errorTitle');
    const errorText = document.getElementById('errorText');
    if (errorCard) errorCard.hidden = false;
    if (viewWrap) viewWrap.hidden = true;
    if (errorTitle) errorTitle.textContent = title;
    if (errorText) errorText.textContent = text;
    window.markReady && window.markReady();
}

/* ============================================================
   RENDER
   ============================================================ */
function renderView(f) {
    const errorCard = document.getElementById('errorCard');
    const viewWrap = document.getElementById('viewWrap');
    const viewMeta = document.getElementById('viewMeta');
    const captureReel = document.getElementById('captureReel');
    const captureRating = document.getElementById('captureRating');
    const captureGrid = document.getElementById('captureGrid');
    const captureMessage = document.getElementById('captureMessage');
    const captureMessageText = document.getElementById('captureMessageText');
    const captureDate = document.getElementById('captureDate');

    const rating = Number(f.rating) || 0;
    const reelTitle = getReelTitle(f);
    const safe = escapeHTML;

    if (viewMeta) viewMeta.textContent = (f.reelId || 'Feedback') + ' · ' + formatDate(f.submittedAt);

    if (captureReel) {
        captureReel.innerHTML = `
            ${f.reelId ? `<span class="reel-row-id">${safe(f.reelId)}</span>` : ''}
            ${reelTitle ? `<div style="font-size:26px;font-weight:800;letter-spacing:-.8px;line-height:1.2;margin-top:8px;">${safe(reelTitle)}</div>` : ''}
        `;
    }

    if (captureRating) {
        captureRating.innerHTML = `
            <div class="capture-rating">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1z"/>
                </svg>
                <span>${safe(rating)} / 5</span>
            </div>
        `;
    }

    if (captureGrid) {
        const items = [];
        if (f.feeling) items.push(captureItem('Feeling', f.feeling));
        if (f.more) items.push(captureItem('Would watch more', f.more));
        if (f.wantMore) items.push(captureItem('Wants more of', f.wantMore));
        if (f.engageAgain) items.push(captureItem('Engage again', f.engageAgain));
        items.push(captureItem('From', f.name || 'Anonymous'));
        captureGrid.innerHTML = items.join('');
    }

    const msg = (f.message || '').trim();
    if (msg) {
        if (captureMessage) captureMessage.hidden = false;
        if (captureMessageText) captureMessageText.textContent = msg;
    } else {
        if (captureMessage) captureMessage.hidden = true;
    }

    if (captureDate) captureDate.textContent = formatDate(f.submittedAt);

    if (errorCard) errorCard.hidden = true;
    if (viewWrap) viewWrap.hidden = false;
    window.markReady && window.markReady();
}

function captureItem(label, value) {
    return `
        <div class="row-item">
            <span class="row-item-label">${escapeHTML(label)}</span>
            <span class="row-item-value">${escapeHTML(value)}</span>
        </div>
    `;
}

/* ============================================================
   4K IMAGE
   ============================================================ */
async function generate4KCanvas() {
    const target = document.getElementById('captureArea');
    if (!target) throw new Error('Capture area not found');
    const cssWidth = target.offsetWidth;
    const scale = TARGET_WIDTH / cssWidth;
    return await html2canvas(target, {
        scale,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        windowWidth: cssWidth,
        windowHeight: target.offsetHeight
    });
}

function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
}

function showStatus(text, isError) {
    const shareStatus = document.getElementById('shareStatus');
    if (!shareStatus) return;
    shareStatus.textContent = text;
    shareStatus.hidden = false;
    shareStatus.style.background = isError ? '#fff2f2' : '';
    shareStatus.style.borderColor = isError ? '#f0c7c7' : '';
    shareStatus.style.color = isError ? '#b03030' : '';
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => { shareStatus.hidden = true; }, 4000);
}

async function withButtonLock(btn, label, fn) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = label;
    try { await fn(); }
    finally { btn.disabled = false; btn.innerHTML = original; }
}

/* ============================================================
   BINDINGS
   ============================================================ */
function bindActions() {
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const backBtn = document.getElementById('backBtn');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.navigateTo && window.navigateTo('notifications');
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            withButtonLock(downloadBtn, 'Preparing…', async () => {
                try {
                    const canvas = await generate4KCanvas();
                    const blob = await canvasToBlob(canvas);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'rudra-feedback-' + (currentFeedback?.id || 'review') + '.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    showStatus('4K image downloaded.');
                } catch (err) {
                    console.error('Download failed:', err);
                    showStatus('Could not generate image. Please try again.', true);
                }
            });
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            withButtonLock(shareBtn, 'Preparing…', async () => {
                try {
                    const canvas = await generate4KCanvas();
                    const blob = await canvasToBlob(canvas);
                    const file = new File(
                        [blob],
                        'rudra-feedback-' + (currentFeedback?.id || 'review') + '.png',
                        { type: 'image/png' }
                    );

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: 'Rudra Bhakti — Feedback',
                            text: 'Sharing a feedback review from Rudra Bhakti.'
                        });
                        showStatus('Shared successfully.');
                        return;
                    }

                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    showStatus('Share not supported — image downloaded instead.');
                } catch (err) {
                    if (err && err.name === 'AbortError') return;
                    console.error('Share failed:', err);
                    showStatus('Could not share image. Please try again.', true);
                }
            });
        });
    }
}
