/* ============================================================
   RUDRA BHAKTI — CONTENT AUDIT & GROWTH INTELLIGENCE
   Fully dynamic, Firebase-powered, zero mock data
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getDatabase, ref, get, push, set, onValue }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAoPVLSklKARDfdDoSm6L2zkj1kabJVpsw",
    authDomain: "rudrabhakti-a1d3e.firebaseapp.com",
    databaseURL: "https://rudrabhakti-a1d3e-default-rtdb.firebaseio.com",
    projectId: "rudrabhakti-a1d3e",
    storageBucket: "rudrabhakti-a1d3e.firebasestorage.app",
    messagingSenderId: "96491326088",
    appId: "1:96491326088:web:593b15e565a12f57936d3d",
    measurementId: "G-DF9MKJ113R"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const ADMIN_UID = 'ukvRTL3B3WOoasKnJI7t6USMeUF3';

/* ============================================================
   DEFAULT SETTINGS
   ============================================================ */
const DEFAULT_SETTINGS = {
    minSample: 10,
    strongSample: 30,
    goodRating: 4.0,
    poorRating: 2.5,
    significantChange: 10,
    weightRating: 0.35,
    weightRecommend: 0.30,
    weightFuture: 0.20,
    weightRepeat: 0.15
};

let settings = { ...DEFAULT_SETTINGS };

/* ============================================================
   STATE
   ============================================================ */
let allFeedback = [];
let savedReels = [];
let snapshots = [];
let currentPeriod = '7d';
let currentCompare = 'previous';
let currentReelFilter = 'all';
let customRangeStart = null;
let customRangeEnd = null;
let sessionTimer = null;
let sessionWarnTimer = null;
let sessionCountdownInterval = null;
let compareLabSelection = new Set();
let experimentGroupA = new Set();
let experimentGroupB = new Set();
let unsubFeedback = null;
let unsubReels = null;
let unsubHistory = null;
let unsubSettings = null;
let unsubRecoStatus = null;
let recoStatuses = {};

const $ = (id) => document.getElementById(id);

/* ============================================================
   DOM REFS
   ============================================================ */
const loginWrap = $('loginWrap');
const dash = $('dash');
const loginForm = $('loginForm');
const loginEmail = $('loginEmail');
const loginPassword = $('loginPassword');
const loginError = $('loginError');
const loginLabel = $('loginLabel');
const logoutBtn = $('logoutBtn');
const drawerUserEmail = $('drawerUserEmail');
const drawer = $('drawer');
const drawerBackdrop = $('drawerBackdrop');
const drawerClose = $('drawerClose');
const drawerLogout = $('drawerLogout');
const menuBtn = $('menuBtn');
const drawerLinks = document.querySelectorAll('.drawer-link[data-drawer]');
const navLinks = document.querySelectorAll('.dash-nav-link[data-nav]');
const logoutModal = $('logoutModal');
const logoutBackdrop = $('logoutBackdrop');
const logoutCancel = $('logoutCancel');
const logoutConfirm = $('logoutConfirm');

const periodSelect = $('periodSelect');
const customRangeGroup = $('customRangeGroup');
const customEndGroup = $('customEndGroup');
const customStartInput = $('customStart');
const customEndInput = $('customEnd');
const compareSelect = $('compareSelect');
const reelFilter = $('reelFilter');
const snapshotBtn = $('snapshotBtn');
const exportCsvBtn = $('exportCsvBtn');
const exportPdfBtn = $('exportPdfBtn');

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHTML(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function pct(n, d) {
    if (!d) return 0;
    return Math.round((n / d) * 100);
}
function fmtNum(n, d = 1) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toFixed(d);
}
function fmtPct(n) {
    if (n == null || isNaN(n)) return '—';
    return Math.round(n) + '%';
}
function formatDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kolkata'
    });
}
function confidenceFor(sample) {
    if (sample < settings.minSample) return { level: 'Insufficient Data', cls: 'insufficient' };
    if (sample < settings.strongSample) return { level: 'Low', cls: 'low' };
    if (sample < settings.strongSample * 2) return { level: 'Medium', cls: 'medium' };
    return { level: 'High', cls: 'high' };
}
function periodRange(period) {
    const now = Date.now();
    const day = 86400000;

    if (period === 'custom') {
        if (customRangeStart && customRangeEnd) {
            const s = new Date(customRangeStart);
            s.setHours(0, 0, 0, 0);
            const e = new Date(customRangeEnd);
            e.setHours(23, 59, 59, 999);
            const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / day));
            return { start: s.getTime(), end: e.getTime(), days };
        }
        /* Fallback to 7 days if custom not set */
        return { start: now - 7 * day, end: now, days: 7 };
    }

    if (period === 'today') {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        return { start: d.getTime(), end: now, days: 1 };
    }
    if (period === '7d') return { start: now - 7 * day, end: now, days: 7 };
    if (period === '30d') return { start: now - 30 * day, end: now, days: 30 };
    if (period === '90d') return { start: now - 90 * day, end: now, days: 90 };
    return { start: 0, end: now, days: 999 };
}
function previousPeriodRange(period) {
    const now = Date.now();
    const day = 86400000;
    if (period === 'custom') {
        if (customRangeStart && customRangeEnd) {
            const s = new Date(customRangeStart);
            s.setHours(0, 0, 0, 0);
            const e = new Date(customRangeEnd);
            e.setHours(23, 59, 59, 999);
            const span = e.getTime() - s.getTime();
            return { start: s.getTime() - span - 1, end: s.getTime() - 1 };
        }
        return { start: now - 14 * day, end: now - 7 * day };
    }
    if (period === 'today') {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        return { start: d.getTime() - day, end: d.getTime() - 1 };
    }
    if (period === '7d') return { start: now - 14 * day, end: now - 7 * day };
    if (period === '30d') return { start: now - 60 * day, end: now - 30 * day };
    if (period === '90d') return { start: now - 180 * day, end: now - 90 * day };
    return { start: 0, end: now - 90 * day };
}
function inRange(ts, start, end) {
    if (!ts) return false;
    const t = new Date(ts).getTime();
    return t >= start && t <= end;
}
/* ============================================================
   RECOMMENDATION KEY
   ============================================================ */
function recoKey(r) {
    /* Stable key from finding + primary tag */
    const src = (r.finding || '') + '|' + ((r.tags && r.tags[0]) || '');
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
        hash = ((hash << 5) - hash + src.charCodeAt(i)) | 0;
    }
    return 'r' + Math.abs(hash).toString(36);
}

/* ============================================================
   FILTERING
   ============================================================ */
function filterFeedback(list, range, reelFilter = 'all') {
    return list.filter((f) => {
        if (!inRange(f.submittedAt, range.start, range.end)) return false;
        if (reelFilter !== 'all' && f.reelId !== reelFilter) return false;
        return true;
    });
}

/* ============================================================
   METRIC CALCULATIONS
   ============================================================ */
function calcMetrics(list) {
    const total = list.length;
    if (!total) return {
        total: 0, rated: 0, satisfaction: 0, recommend: 0, future: 0,
        repeat: 0, hold: 0, presentation: 0, emotion: 0, written: 0,
        avgRating: 0, healthScore: 0, confidence: confidenceFor(0)
    };

    const rated = list.filter((f) => Number(f.rating) >= 1 && Number(f.rating) <= 5);
    const avgRating = rated.length
        ? rated.reduce((s, f) => s + Number(f.rating), 0) / rated.length
        : 0;
    const satisfaction = avgRating ? Math.round((avgRating / 5) * 100) : 0;

    const recYes = list.filter((f) => {
        const v = (f.wouldWatchMore || f.more || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes') || v.startsWith('probably yes');
    }).length;
    const recommend = pct(recYes, total);

    const futYes = list.filter((f) => {
        const v = (f.wouldWatchMore || f.more || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;
    const future = pct(futYes, total);

    const repYes = list.filter((f) => {
        const v = (f.engageAgain || '').toLowerCase();
        return v.startsWith('very likely') || v.startsWith('likely');
    }).length;
    const repeat = pct(repYes, total);

    const holdYes = list.filter((f) => {
        const v = (f.heldInterest || '').toLowerCase();
        return v.startsWith('yes, completely') || v.startsWith('mostly');
    }).length;
    const hold = pct(holdYes, total);

    const presPositive = list.filter((f) => {
        const v = (f.presentation || '').toLowerCase();
        return v.startsWith('excellent') || v.startsWith('good');
    }).length;
    const presValid = list.filter((f) => (f.presentation || '').trim()).length;
    const presentation = pct(presPositive, presValid);

    const emoPositive = list.filter((f) => {
        const v = (f.feeling || '').trim();
        return ['Peaceful','Devotional','Emotional','Inspired','Calm','Deeply moved'].includes(v);
    }).length;
    const emoValid = list.filter((f) => (f.feeling || '').trim()).length;
    const emotion = pct(emoPositive, emoValid);

    const written = list.filter((f) => (f.message || '').trim()).length;

    const healthScore =
        (satisfaction * settings.weightRating) +
        (recommend * settings.weightRecommend) +
        (future * settings.weightFuture) +
        (repeat * settings.weightRepeat);
    const roundedHealth = Math.round(healthScore);

    const confidence = confidenceFor(total);

    return {
        total, rated: rated.length, avgRating, satisfaction, recommend,
        future, repeat, hold, presentation, emotion, written,
        healthScore: roundedHealth, confidence
    };
}

/* ============================================================
   RENDER — EXECUTIVE
   ============================================================ */
function renderExecutive() {
    const range = periodRange(currentPeriod);
    const prevRange = previousPeriodRange(currentPeriod);

    const current = filterFeedback(allFeedback, range, currentReelFilter);
    const previous = filterFeedback(allFeedback, prevRange, currentReelFilter);

    const c = calcMetrics(current);
    const p = calcMetrics(previous);

        const scopeText = $('execScopeText');
    if (scopeText) {
        const periodLabel = currentPeriod === 'custom'
            ? `Custom (${customRangeStart || '?'} → ${customRangeEnd || '?'})`
            : currentPeriod;
        scopeText.textContent = `${c.total} responses · ${savedReels.length} reels · Period: ${periodLabel} · Comparison: ${currentCompare === 'previous' ? 'previous period' : 'all-time'}`;
    }

    const hs = $('healthScore');
    const hm = $('healthMeter');
    const hss = $('healthScoreSub');
    if (hs) hs.textContent = c.total ? c.healthScore + ' / 100' : '—';
    if (hm) hm.style.width = Math.min(c.healthScore, 100) + '%';
    if (hss) hss.textContent = c.total
        ? `Confidence: ${c.confidence.level} · ${c.total} responses`
        : 'Not enough data yet';

    setMetric('execSatisfaction', c.satisfaction + '%', p.satisfaction, c.satisfaction);
    setMetric('execRecommend', c.recommend + '%', p.recommend, c.recommend);
    setMetric('execFuture', c.future + '%', p.future, c.future);
    setMetric('execRepeat', c.repeat + '%', p.repeat, c.repeat);
    setMetric('execHold', c.hold + '%', p.hold, c.hold);
    setMetric('execPresentation', c.presentation + '%', p.presentation, c.presentation);
    setMetric('execEmotion', c.emotion + '%', p.emotion, c.emotion);

    const momentumEl = $('execMomentum');
    const momentumSub = $('execMomentumSub');
    if (momentumEl) {
        const delta = c.healthScore - p.healthScore;
        momentumEl.textContent = !p.total
            ? (c.total ? 'Baseline' : '—')
            : delta > 3 ? 'Improving' : delta < -3 ? 'Declining' : 'Stable';
        if (momentumSub) {
            momentumSub.textContent = p.total
                ? `${delta >= 0 ? '+' : ''}${delta} pts vs baseline`
                : 'Need prior-period data';
        }
    }

    /* Signals */
    const signals = [
        { key: 'Satisfaction', val: c.satisfaction },
        { key: 'Recommendation', val: c.recommend },
        { key: 'Future Interest', val: c.future },
        { key: 'Repeat Intent', val: c.repeat },
        { key: 'Hold/Interest', val: c.hold },
        { key: 'Presentation', val: c.presentation },
        { key: 'Emotion', val: c.emotion }
    ].filter((s) => s.val > 0);
    signals.sort((a, b) => b.val - a.val);

    $('strongestSignal').textContent = signals[0]
        ? `${signals[0].key} at ${signals[0].val}%`
        : 'Not enough data yet';
    $('weakestSignal').textContent = signals.length > 1
        ? `${signals[signals.length-1].key} at ${signals[signals.length-1].val}%`
        : 'Not enough data yet';

    /* Risk / Opportunity — real data checks */
    const negRate = c.total ? Math.round((current.filter((f) => Number(f.rating) <= 2).length / c.total) * 100) : 0;
    const bigRisk = negRate >= 25
        ? `Elevated negative ratings (${negRate}%)`
        : !p.total ? 'Not enough comparison data'
        : (c.satisfaction < p.satisfaction - settings.significantChange) ? 'Satisfaction declining vs baseline'
        : 'No significant risk detected';
    $('biggestRisk').textContent = bigRisk;

    const wants = {};
    current.forEach((f) => {
        const k = (f.wantMore || '').trim();
        if (k) wants[k] = (wants[k] || 0) + 1;
    });
    const topWant = Object.entries(wants).sort((a, b) => b[1] - a[1])[0];
    $('biggestOpportunity').textContent = topWant
        ? `Requested content: "${topWant[0]}" (${topWant[1]} requests)`
        : 'Not enough preference data yet';

    /* Summary narrative */
    const summaryEl = $('auditSummary');
    if (summaryEl) {
        if (!c.total) {
            summaryEl.textContent = 'Insufficient data for a reliable insight. Collect feedback to enable auditing.';
        } else {
            const parts = [];
            parts.push(`Across ${c.total} responses, the content health score is ${c.healthScore}/100 with ${c.confidence.level.toLowerCase()} confidence.`);
            parts.push(`Satisfaction sits at ${c.satisfaction}%, recommendation at ${c.recommend}%, and future interest at ${c.future}%.`);
            if (p.total) {
                const sDelta = c.satisfaction - p.satisfaction;
                if (Math.abs(sDelta) >= settings.significantChange) {
                    parts.push(`Satisfaction is ${sDelta > 0 ? 'up' : 'down'} ${Math.abs(sDelta)} points vs the previous period.`);
                } else {
                    parts.push('Satisfaction is stable vs the previous period.');
                }
            }
            if (signals.length) {
                parts.push(`Strongest signal: ${signals[0].key} (${signals[0].val}%).`);
                if (signals.length > 1) {
                    parts.push(`Weakest signal: ${signals[signals.length-1].key} (${signals[signals.length-1].val}%).`);
                }
            }
            summaryEl.textContent = parts.join(' ');
        }
    }
}

function setMetric(id, value, prevValue, currValue) {
    const el = $(id);
    if (!el) return;
    el.textContent = value;
    const deltaEl = $(id + 'Delta');
    if (deltaEl) {
        if (prevValue == null || prevValue === 0) {
            deltaEl.textContent = '—';
            deltaEl.className = 'audit-exec-sub';
            return;
        }
        const delta = currValue - prevValue;
        deltaEl.textContent = (delta >= 0 ? '+' : '') + Math.round(delta) + ' pts vs baseline';
        deltaEl.className = 'audit-exec-sub ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : '');
    }
}

/* ============================================================
   RENDER — REEL AUDIT
   ============================================================ */
const REEL_AUDIT_PER_PAGE = 5;
let reelAuditPage = 1;

function classifyReel(stats) {
    if (!stats || stats.total < settings.minSample) return { label: 'Insufficient Data', cls: 'insufficient' };
    const conf = confidenceFor(stats.total);
    if (stats.avg >= 4.5 && stats.recommend >= 70) return { label: 'Core Winner', cls: 'winner' };
    if (stats.avg >= 4.0 && stats.recommend >= 50) return { label: 'High Potential', cls: 'potential' };
    if (stats.avg >= 3.5) return { label: 'Stable', cls: 'stable' };
    if (stats.avg >= 3.0) return { label: 'Needs Improvement', cls: 'improve' };
    return { label: 'Underperforming', cls: 'under' };
}

function computeReelStats(reelId, range) {
    const items = allFeedback.filter((f) => {
        if (f.reelId !== reelId) return false;
        if (!inRange(f.submittedAt, range.start, range.end)) return false;
        return true;
    });
    if (!items.length) return null;
    const total = items.length;
    const rated = items.filter((f) => Number(f.rating) >= 1 && Number(f.rating) <= 5);
    const avg = rated.length ? rated.reduce((s, f) => s + Number(f.rating), 0) / rated.length : 0;
    const recYes = items.filter((f) => {
        const v = (f.wouldWatchMore || f.more || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;
    const recommend = pct(recYes, total);
    const repYes = items.filter((f) => (f.engageAgain || '').toLowerCase().startsWith('very likely') || (f.engageAgain || '').toLowerCase().startsWith('likely')).length;
    const repeat = pct(repYes, total);
    const written = items.filter((f) => (f.message || '').trim()).length;
    const confidence = confidenceFor(total);
    return { total, avg, recommend, repeat, written, confidence };
}

function renderReelAudit() {
    const listEl = $('reelAuditList');
    const emptyEl = $('reelAuditEmpty');
    const pgEl = $('reelAuditPagination');
    if (!listEl || !emptyEl) return;

    const range = periodRange(currentPeriod);

    if (!savedReels.length) {
        emptyEl.hidden = false;
        listEl.hidden = true;
        if (pgEl) pgEl.hidden = true;
        return;
    }

    const totalPages = Math.max(1, Math.ceil(savedReels.length / REEL_AUDIT_PER_PAGE));
    if (reelAuditPage > totalPages) reelAuditPage = totalPages;
    const start = (reelAuditPage - 1) * REEL_AUDIT_PER_PAGE;
    const pageItems = savedReels.slice(start, start + REEL_AUDIT_PER_PAGE);

    emptyEl.hidden = true;
    listEl.hidden = false;

    listEl.innerHTML = pageItems.map((r) => {
        const stats = computeReelStats(r.id, range);
        const cls = classifyReel(stats);
        if (!stats) {
            return `
                <div class="audit-reel-row">
                    <div class="audit-reel-head">
                        <span class="audit-reel-id">${escapeHTML(r.id)}</span>
                        <span class="audit-reel-title">${escapeHTML(r.title || '')}</span>
                        <span class="audit-reel-class audit-reel-class--${cls.cls}">${cls.label}</span>
                    </div>
                    <div class="audit-reel-metrics">
                        <div class="audit-reel-metric">
                            <div class="audit-reel-metric-label">Responses</div>
                            <div class="audit-reel-metric-value">0</div>
                        </div>
                    </div>
                </div>
            `;
        }
        return `
            <div class="audit-reel-row">
                <div class="audit-reel-head">
                    <span class="audit-reel-id">${escapeHTML(r.id)}</span>
                    <span class="audit-reel-title">${escapeHTML(r.title || '')}</span>
                    <span class="audit-reel-class audit-reel-class--${cls.cls}">${cls.label}</span>
                </div>
                <div class="audit-reel-metrics">
                    <div class="audit-reel-metric">
                        <div class="audit-reel-metric-label">Responses</div>
                        <div class="audit-reel-metric-value">${stats.total}</div>
                    </div>
                    <div class="audit-reel-metric">
                        <div class="audit-reel-metric-label">Avg Rating</div>
                        <div class="audit-reel-metric-value">${fmtNum(stats.avg)}/5</div>
                    </div>
                    <div class="audit-reel-metric">
                        <div class="audit-reel-metric-label">Recommend</div>
                        <div class="audit-reel-metric-value">${stats.recommend}%</div>
                    </div>
                    <div class="audit-reel-metric">
                        <div class="audit-reel-metric-label">Repeat</div>
                        <div class="audit-reel-metric-value">${stats.repeat}%</div>
                    </div>
                    <div class="audit-reel-metric">
                        <div class="audit-reel-metric-label">Confidence</div>
                        <div class="audit-reel-metric-value">${stats.confidence.level}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (pgEl) {
        if (totalPages <= 1) {
            pgEl.hidden = true;
        } else {
            pgEl.hidden = false;
            pgEl.innerHTML = `
                <button type="button" class="pg-btn" data-pg="prev" ${reelAuditPage === 1 ? 'disabled' : ''}>Prev</button>
                <span class="pg-info">Page ${reelAuditPage} of ${totalPages}</span>
                <button type="button" class="pg-btn" data-pg="next" ${reelAuditPage === totalPages ? 'disabled' : ''}>Next</button>
            `;
            pgEl.querySelector('[data-pg="prev"]').onclick = () => { reelAuditPage--; renderReelAudit(); };
            pgEl.querySelector('[data-pg="next"]').onclick = () => { reelAuditPage++; renderReelAudit(); };
        }
    }
}

/* ============================================================
   RENDER — PATTERNS
   ============================================================ */
function renderPatterns() {
    const wrap = $('patternGridAudit');
    if (!wrap) return;
    const range = periodRange(currentPeriod);
    const list = filterFeedback(allFeedback, range, currentReelFilter);

    if (list.length < settings.minSample) {
        wrap.innerHTML = `<div class="audit-card"><span class="audit-card-desc">Insufficient data for a reliable insight.</span></div>`;
        return;
    }

    const feelings = {};
    const stoodOut = {};
    const wants = {};
    const improve = {};
    list.forEach((f) => {
        if (f.feeling) feelings[f.feeling] = (feelings[f.feeling] || 0) + 1;
        if (f.stoodOut) stoodOut[f.stoodOut] = (stoodOut[f.stoodOut] || 0) + 1;
        if (f.wantMore) wants[f.wantMore] = (wants[f.wantMore] || 0) + 1;
        if (f.improve) improve[f.improve] = (improve[f.improve] || 0) + 1;
    });
    const top = (m) => Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    const cards = [
        { title: 'Dominant Feeling', top: top(feelings), total: list.length },
        { title: 'Most Valued Element', top: top(stoodOut), total: list.length },
        { title: 'Requested Content', top: top(wants), total: list.length },
        { title: 'Improvement Focus', top: top(improve), total: list.length }
    ];

    wrap.innerHTML = cards.filter((c) => c.top).map((c) => `
        <div class="audit-card">
            <span class="audit-card-title">${escapeHTML(c.title)}</span>
            <span class="audit-card-value">${escapeHTML(c.top[0])}</span>
            <span class="audit-card-desc">Observed in ${c.top[1]} of ${c.total} responses (${pct(c.top[1], c.total)}%)</span>
            <span class="audit-card-tag">Observed Pattern</span>
        </div>
    `).join('') || `<div class="audit-card"><span class="audit-card-desc">Insufficient data for a reliable insight.</span></div>`;
}

/* ============================================================
   RENDER — AUDIENCE VOICE
   ============================================================ */
function renderVoice() {
    const wrap = $('auditVoiceGrid');
    if (!wrap) return;
    const range = periodRange(currentPeriod);
    const written = filterFeedback(allFeedback, range, currentReelFilter).filter((f) => (f.message || '').trim());

    if (!written.length) {
        wrap.innerHTML = `<div class="audit-card"><span class="audit-card-desc">No written feedback yet.</span></div>`;
        return;
    }

    const words = {};
    const stop = new Set(['the','a','an','and','or','but','is','are','was','were','to','of','in','on','for','with','at','by','from','this','that','it','i','you','we','they','he','she','very','so','too','my','your','our','their','as','if','then','than','be','been','has','have','had','not','no','do','does','did','can','could','would','should','will','just','only','also','well','like']);
    written.forEach((f) => {
        (f.message || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).forEach((w) => {
            if (w.length >= 3 && !stop.has(w)) words[w] = (words[w] || 0) + 1;
        });
    });
    const top = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 8);

    wrap.innerHTML = top.map(([w, c]) => `
        <div class="audit-card">
            <span class="audit-card-title">Common Theme</span>
            <span class="audit-card-value">${escapeHTML(w)}</span>
            <span class="audit-card-desc">Mentioned ${c} time${c === 1 ? '' : 's'}</span>
        </div>
    `).join('');
}

/* ============================================================
   RENDER — CONTRADICTIONS
   ============================================================ */
function renderContradictions() {
    const wrap = $('auditContradictions');
    if (!wrap) return;
    const range = periodRange(currentPeriod);
    const list = filterFeedback(allFeedback, range, currentReelFilter);
    const items = [];

    if (list.length >= settings.minSample) {
        const highRatingLowRepeat = list.filter((f) => Number(f.rating) >= 4 && (f.engageAgain || '').toLowerCase().startsWith('unlikely'));
        if (highRatingLowRepeat.length >= Math.max(2, settings.minSample * 0.2)) {
            items.push({
                cls: 'warning',
                title: 'High rating, low repeat intent',
                desc: `${highRatingLowRepeat.length} responses rated 4+ but indicated low repeat intent.`
            });
        }
        const presHighRecLow = list.filter((f) => {
            const p = (f.presentation || '').toLowerCase();
            const r = (f.wouldWatchMore || f.more || '').toLowerCase();
            return (p.startsWith('excellent') || p.startsWith('good')) && (r.startsWith('not really') || r.startsWith('no'));
        });
        if (presHighRecLow.length >= 2) {
            items.push({
                cls: 'info',
                title: 'Strong presentation, low recommendation',
                desc: `${presHighRecLow.length} responses praised presentation but did not recommend.`
            });
        }
    }

    if (!items.length) {
        wrap.innerHTML = `<div class="chart-empty"><p>No contradictions detected.</p></div>`;
        return;
    }
    wrap.innerHTML = items.map((i) => `
        <div class="alert-item alert-item--${i.cls}">
            <div class="alert-title">${escapeHTML(i.title)}</div>
            <div class="alert-desc">${escapeHTML(i.desc)}</div>
        </div>
    `).join('');
}

/* ============================================================
   RENDER — RISKS
   ============================================================ */
function renderRisks() {
    const wrap = $('auditRisks');
    if (!wrap) return;
    const range = periodRange(currentPeriod);
    const prevRange = previousPeriodRange(currentPeriod);
    const curr = filterFeedback(allFeedback, range, currentReelFilter);
    const prev = filterFeedback(allFeedback, prevRange, currentReelFilter);

    const items = [];
    if (curr.length >= settings.minSample) {
        const negRate = Math.round((curr.filter((f) => Number(f.rating) <= 2).length / curr.length) * 100);
        if (negRate >= 25) items.push({ cls: 'warning', title: 'Elevated negative ratings', desc: `${negRate}% rated 2 or below.`, severity: 'High' });

        if (prev.length >= settings.minSample) {
            const cAvg = curr.reduce((s, f) => s + Number(f.rating || 0), 0) / curr.length;
            const pAvg = prev.reduce((s, f) => s + Number(f.rating || 0), 0) / prev.length;
            const deltaPct = pAvg ? ((cAvg - pAvg) / pAvg) * 100 : 0;
            if (deltaPct <= -settings.significantChange) {
                items.push({ cls: 'warning', title: 'Rating decline detected', desc: `Average rating down ${Math.abs(deltaPct).toFixed(1)}% vs previous period.`, severity: 'High' });
            }
        }
    }

    if (!items.length) {
        wrap.innerHTML = `<div class="chart-empty"><p>No risks detected with current data.</p></div>`;
        return;
    }
    wrap.innerHTML = items.map((i) => `
        <div class="alert-item alert-item--${i.cls}">
            <div class="alert-title">${escapeHTML(i.title)} — ${escapeHTML(i.severity)}</div>
            <div class="alert-desc">${escapeHTML(i.desc)}</div>
        </div>
    `).join('');
}

/* ============================================================
   RENDER — OPPORTUNITIES
   ============================================================ */
function renderOpportunities() {
    const wrap = $('auditOpportunities');
    if (!wrap) return;
    const range = periodRange(currentPeriod);
    const list = filterFeedback(allFeedback, range, currentReelFilter);
    const items = [];

    if (list.length >= settings.minSample) {
        const wants = {};
        list.forEach((f) => {
            const k = (f.wantMore || '').trim();
            if (k) wants[k] = (wants[k] || 0) + 1;
        });
        const top = Object.entries(wants).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] >= 3) {
            items.push({ cls: 'info', title: 'Requested content opportunity', desc: `"${top[0]}" requested ${top[1]} times (${pct(top[1], list.length)}%).`, confidence: confidenceFor(top[1]).level });
        }

        const best = savedReels.map((r) => ({ id: r.id, stats: computeReelStats(r.id, range) }))
            .filter((x) => x.stats && x.stats.total >= settings.minSample)
            .sort((a, b) => b.stats.avg - a.stats.avg)[0];
        if (best && best.stats.avg >= 4.5) {
            items.push({ cls: 'info', title: 'Repeat winning pattern', desc: `${best.id} averaged ${best.stats.avg.toFixed(1)}/5 — replicate its approach.`, confidence: best.stats.confidence.level });
        }
    }

    if (!items.length) {
        wrap.innerHTML = `<div class="chart-empty"><p>No opportunities detected yet.</p></div>`;
        return;
    }
    wrap.innerHTML = items.map((i) => `
        <div class="alert-item alert-item--${i.cls}">
            <div class="alert-title">${escapeHTML(i.title)}</div>
            <div class="alert-desc">${escapeHTML(i.desc)}</div>
            ${i.confidence ? `<div class="alert-meta"><span class="audit-card-tag">Confidence: ${escapeHTML(i.confidence)}</span></div>` : ''}
        </div>
    `).join('');
}

/* ============================================================
   RENDER — PORTFOLIO
   ============================================================ */
function renderPortfolio() {
    const wrap = $('portfolioGridAudit');
    if (!wrap) return;
    const range = periodRange(currentPeriod);
    const buckets = { winners: [], potential: [], stable: [], experimental: [], improve: [], under: [] };

    savedReels.forEach((r) => {
        const stats = computeReelStats(r.id, range);
        if (!stats || stats.total < settings.minSample) { buckets.experimental.push(r.id); return; }
        const cls = classifyReel(stats);
        if (cls.label === 'Core Winner') buckets.winners.push(r.id);
        else if (cls.label === 'High Potential') buckets.potential.push(r.id);
        else if (cls.label === 'Stable') buckets.stable.push(r.id);
        else if (cls.label === 'Needs Improvement') buckets.improve.push(r.id);
        else if (cls.label === 'Underperforming') buckets.under.push(r.id);
        else buckets.experimental.push(r.id);
    });

    const cats = [
        { name: 'Core Winners', list: buckets.winners },
        { name: 'High Potential', list: buckets.potential },
        { name: 'Stable', list: buckets.stable },
        { name: 'Experimental', list: buckets.experimental },
        { name: 'Needs Improvement', list: buckets.improve },
        { name: 'Underperforming', list: buckets.under }
    ].filter((c) => c.list.length);

    if (!cats.length) {
        wrap.innerHTML = `<div class="audit-card"><span class="audit-card-desc">No classification available yet.</span></div>`;
        return;
    }
    wrap.innerHTML = cats.map((c) => `
        <div class="audit-card">
            <span class="audit-card-title">${escapeHTML(c.name)}</span>
            <span class="audit-card-value">${c.list.length} reel${c.list.length === 1 ? '' : 's'}</span>
            <span class="audit-card-desc">${c.list.map(escapeHTML).join(', ')}</span>
        </div>
    `).join('');
}

/* ============================================================
   RENDER — RECOMMENDATIONS
   ============================================================ */
function buildRecommendations() {
    const range = periodRange(currentPeriod);
    const prevRange = previousPeriodRange(currentPeriod);
    const curr = filterFeedback(allFeedback, range, currentReelFilter);
    const prev = filterFeedback(allFeedback, prevRange, currentReelFilter);
    const recos = [];

    if (!curr.length) return recos;

    const c = calcMetrics(curr);
    const p = calcMetrics(prev);

    /* Repeat best reel */
    const best = savedReels.map((r) => ({ id: r.id, stats: computeReelStats(r.id, range) }))
        .filter((x) => x.stats && x.stats.total >= settings.minSample)
        .sort((a, b) => b.stats.avg - a.stats.avg)[0];
    if (best && best.stats.avg >= settings.goodRating) {
        recos.push({
            priority: best.stats.avg >= 4.5 ? 'High' : 'Medium',
            category: 'Repeat',
            finding: `${best.id} is your best-performing reel.`,
            evidence: `Average rating ${best.stats.avg.toFixed(1)}/5, recommend rate ${best.stats.recommend}%, ${best.stats.total} responses.`,
            interpretation: 'Pattern is validated across a sufficient sample.',
            action: `Produce content that replicates ${best.id}'s structure and tone.`,
            confidence: best.stats.confidence.level,
            tags: [best.id, 'Winning Pattern'],
            monitor: 'Compare new reels against this baseline for the next 30 days.'
        });
    }

    /* Improve worst reel */
    const worst = savedReels.map((r) => ({ id: r.id, stats: computeReelStats(r.id, range) }))
        .filter((x) => x.stats && x.stats.total >= settings.minSample)
        .sort((a, b) => a.stats.avg - b.stats.avg)[0];
    if (worst && worst.stats.avg <= settings.poorRating) {
        recos.push({
            priority: 'High',
            category: 'Improve',
            finding: `${worst.id} is underperforming.`,
            evidence: `Average rating ${worst.stats.avg.toFixed(1)}/5, recommend rate ${worst.stats.recommend}%, ${worst.stats.total} responses.`,
            interpretation: 'Pattern consistently scores below acceptable threshold.',
            action: `Review ${worst.id}'s creative choices and test changes.`,
            confidence: worst.stats.confidence.level,
            tags: [worst.id, 'Underperforming'],
            monitor: 'Re-evaluate after changes for the next 14 days.'
        });
    }

    /* Declining metric */
    if (p.total >= settings.minSample) {
        if (c.satisfaction < p.satisfaction - settings.significantChange) {
            recos.push({
                priority: 'High',
                category: 'Investigate',
                finding: 'Satisfaction is declining.',
                evidence: `Satisfaction ${c.satisfaction}% vs previous ${p.satisfaction}% (${c.satisfaction - p.satisfaction} pts).`,
                interpretation: 'Consistent downward movement across periods.',
                action: 'Investigate recent content for changed characteristics.',
                confidence: 'Medium',
                tags: ['Satisfaction'],
                monitor: 'Track for the next 7 days.'
            });
        }
    }

    /* Content request */
    const wants = {};
    curr.forEach((f) => {
        const k = (f.wantMore || '').trim();
        if (k) wants[k] = (wants[k] || 0) + 1;
    });
    const topWant = Object.entries(wants).sort((a, b) => b[1] - a[1])[0];
    if (topWant && topWant[1] >= Math.max(3, settings.minSample * 0.3)) {
        recos.push({
            priority: 'Medium',
            category: 'Experiment',
            finding: `Audience requesting "${topWant[0]}".`,
            evidence: `${topWant[1]} requests (${pct(topWant[1], curr.length)}% of responses).`,
            interpretation: 'Emerging content preference.',
            action: `Produce one experimental reel in "${topWant[0]}" style and measure response.`,
            confidence: confidenceFor(topWant[1]).level,
            tags: [topWant[0], 'Content Request'],
            monitor: 'Compare test reel against baseline within 2 weeks.'
        });
    }

    return recos;
}

function renderRecommendations() {
    const wrap = $('recommendationsList');
    if (!wrap) return;
    const recos = buildRecommendations();
    if (!recos.length) {
        wrap.innerHTML = `<div class="chart-empty"><p>No recommendations yet — collect more feedback to generate evidence-based actions.</p></div>`;
        return;
    }
    wrap.innerHTML = recos.map((r) => {
        const key = recoKey(r);
        const status = recoStatuses[key]?.status || 'not-started';
        return `
            <div class="audit-reco" data-reco-key="${escapeHTML(key)}">
                <div class="audit-reco-head">
                    <span class="audit-reco-priority audit-reco-priority--${r.priority.toLowerCase()}">${escapeHTML(r.priority)}</span>
                    <span class="audit-reco-cat">${escapeHTML(r.category)}</span>
                    <span class="audit-reco-title">${escapeHTML(r.finding)}</span>
                </div>
                <div class="audit-reco-body">
                    <div><strong>Evidence:</strong> ${escapeHTML(r.evidence)}</div>
                    <div><strong>Interpretation:</strong> ${escapeHTML(r.interpretation)}</div>
                    <div><strong>Recommended action:</strong> ${escapeHTML(r.action)}</div>
                    <div class="muted"><strong>Monitor:</strong> ${escapeHTML(r.monitor)}</div>
                </div>
                <div class="audit-reco-tags">
                    <span class="audit-reco-tag">Confidence: ${escapeHTML(r.confidence)}</span>
                    ${r.tags.map((t) => `<span class="audit-reco-tag">${escapeHTML(t)}</span>`).join('')}
                </div>
                <div class="audit-reco-status-row">
                    <label>Status</label>
                    <select class="audit-reco-status-select" data-key="${escapeHTML(key)}">
                        <option value="not-started" ${status === 'not-started' ? 'selected' : ''}>Not Started</option>
                        <option value="in-progress" ${status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="deferred" ${status === 'deferred' ? 'selected' : ''}>Deferred</option>
                        <option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </div>
            </div>
        `;
    }).join('');

    /* Bind dropdowns */
    wrap.querySelectorAll('.audit-reco-status-select').forEach((sel) => {
        sel.addEventListener('change', () => {
            const key = sel.dataset.key;
            const newStatus = sel.value;
            const reco = recos.find((r) => recoKey(r) === key);
            updateRecoStatus(key, newStatus, reco);
        });
    });
}

/* ============================================================
   RECOMMENDATION OUTCOME
   ============================================================ */
async function updateRecoStatus(key, status, reco) {
    try {
        const existing = recoStatuses[key] || {};
        const payload = {
            status,
            finding: reco?.finding || existing.finding || '',
            category: reco?.category || existing.category || '',
            priority: reco?.priority || existing.priority || '',
            updatedAt: Date.now()
        };

        /* Capture baseline when first moved to In Progress or Completed */
        if (!existing.baseline && (status === 'in-progress' || status === 'completed')) {
            const range = periodRange('30d');
            const list = filterFeedback(allFeedback, range, currentReelFilter);
            const c = calcMetrics(list);
            payload.baseline = {
                capturedAt: Date.now(),
                healthScore: c.healthScore,
                satisfaction: c.satisfaction,
                recommend: c.recommend,
                future: c.future,
                repeat: c.repeat,
                sample: c.total
            };
        } else if (existing.baseline) {
            payload.baseline = existing.baseline;
        }

        await set(ref(db, 'auditRecos/' + key), payload);
    } catch (err) {
        console.error('Update reco status error:', err);
    }
}

function renderOutcomes() {
    const listEl = $('outcomesList');
    const emptyEl = $('outcomesEmpty');
    if (!listEl || !emptyEl) return;

    const entries = Object.entries(recoStatuses)
        .map(([key, v]) => ({ key, ...v }))
        .filter((v) => v.status && v.status !== 'not-started')
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (!entries.length) {
        emptyEl.hidden = false;
        listEl.hidden = true;
        return;
    }
    emptyEl.hidden = true;
    listEl.hidden = false;

    const currentRange = periodRange('30d');
    const currentList = filterFeedback(allFeedback, currentRange, currentReelFilter);
    const current = calcMetrics(currentList);

    listEl.innerHTML = entries.map((e) => {
        const baseline = e.baseline || null;
        const hasBaseline = baseline && baseline.sample >= settings.minSample;
        const currentHasData = current.total >= settings.minSample;

        /* Comparison cells */
        const cells = [];
        let verdict = { text: 'Awaiting sufficient post-action data.', cls: 'insufficient' };

        if (hasBaseline && currentHasData) {
            const metrics = [
                { key: 'healthScore', label: 'Health Score' },
                { key: 'satisfaction', label: 'Satisfaction' },
                { key: 'recommend', label: 'Recommendation' },
                { key: 'future', label: 'Future Interest' },
                { key: 'repeat', label: 'Repeat Intent' }
            ];
            metrics.forEach((m) => {
                const b = baseline[m.key];
                const c = current[m.key];
                const d = c - b;
                const dir = d > 2 ? 'up' : d < -2 ? 'down' : 'flat';
                cells.push(`
                    <div class="outcome-cell">
                        <span class="outcome-cell-label">${escapeHTML(m.label)}</span>
                        <span class="outcome-cell-value">${Math.round(c)}</span>
                        <span class="outcome-cell-delta ${dir}">${d > 0 ? '+' : ''}${Math.round(d)} vs baseline</span>
                    </div>
                `);
            });

            /* Verdict from health score */
            const hDelta = current.healthScore - baseline.healthScore;
            if (Math.abs(hDelta) < settings.significantChange * 0.5) {
                verdict = { text: 'No significant change since action.', cls: 'neutral' };
            } else if (hDelta > 0) {
                verdict = { text: `Improved by ${Math.round(hDelta)} points since action.`, cls: 'improved' };
            } else {
                verdict = { text: `Declined by ${Math.abs(Math.round(hDelta))} points since action.`, cls: 'declined' };
            }
        } else if (!baseline) {
            verdict = { text: 'No baseline captured yet — set status to In Progress or Completed to capture baseline.', cls: 'insufficient' };
        } else {
            verdict = { text: 'Not enough post-action data yet. Keep collecting.', cls: 'insufficient' };
        }

        return `
            <div class="outcome-row">
                <div class="outcome-head">
                    <span class="outcome-status outcome-status--${e.status}">${escapeHTML(e.status.replace('-', ' '))}</span>
                    <span class="outcome-title">${escapeHTML(e.finding || 'Recommendation')}</span>
                </div>
                <div class="outcome-meta">
                    ${e.category ? `<span>${escapeHTML(e.category)}</span>` : ''}
                    ${e.priority ? `<span>${escapeHTML(e.priority)}</span>` : ''}
                    <span>Updated ${escapeHTML(formatDate(e.updatedAt))}</span>
                    ${baseline ? `<span>Baseline: ${baseline.sample} responses</span>` : ''}
                </div>
                ${cells.length ? `<div class="outcome-comparison">${cells.join('')}</div>` : ''}
                <div class="outcome-verdict outcome-verdict--${verdict.cls}">${escapeHTML(verdict.text)}</div>
            </div>
        `;
    }).join('');
}

/* ============================================================
   RENDER — ROADMAP
   ============================================================ */
function renderRoadmap() {
    const wrap = $('roadmapWrap');
    if (!wrap) return;
    const recos = buildRecommendations();
    if (!recos.length) {
        wrap.innerHTML = `<div class="chart-empty"><p>No roadmap items yet.</p></div>`;
        return;
    }
    const immediate = recos.filter((r) => r.priority === 'Critical' || r.priority === 'High');
    const week = recos.filter((r) => r.priority === 'Medium');
    const month = recos.filter((r) => r.priority === 'Low');

    const col = (title, items) => `
        <div class="audit-roadmap-col">
            <div class="audit-roadmap-head">${escapeHTML(title)}</div>
            ${items.length
                ? items.map((r) => `<div class="audit-roadmap-item"><strong>${escapeHTML(r.finding)}</strong>${escapeHTML(r.action)}</div>`).join('')
                : `<div class="audit-roadmap-item muted">No items</div>`}
        </div>
    `;
    wrap.innerHTML =
        col('Immediate', immediate) +
        col('7-Day', week) +
        col('30-Day', month);
}

/* ============================================================
   RENDER — HISTORY
   ============================================================ */
function renderHistory() {
    const listEl = $('historyList');
    const emptyEl = $('historyEmpty');
    if (!listEl || !emptyEl) return;

    if (!snapshots.length) {
        emptyEl.hidden = false;
        listEl.hidden = true;
        return;
    }
    emptyEl.hidden = true;
    listEl.hidden = false;

    const sorted = [...snapshots].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    listEl.innerHTML = sorted.map((s) => `
        <div class="audit-history-row">
            <div>
                <div class="audit-history-when">${escapeHTML(formatDate(s.createdAt))}</div>
                <div class="audit-history-meta">
                    <span>Period: ${escapeHTML(s.period || '—')}</span>
                    <span>Responses: ${escapeHTML(String(s.responses || 0))}</span>
                    <span>Reels: ${escapeHTML(String(s.reels || 0))}</span>
                </div>
            </div>
            <div class="audit-history-score">${escapeHTML(String(s.healthScore || 0))}</div>
        </div>
    `).join('');
}

/* ============================================================
   RENDER — DATA QUALITY AUDIT
   ============================================================ */
function renderQuality() {
    const summaryEl = $('qualitySummary');
    const listEl = $('qualityIssues');
    if (!summaryEl || !listEl) return;

    const issues = [];
    const totalRecords = allFeedback.length;

    /* 1. Invalid ratings */
    const invalidRatings = allFeedback.filter((f) => {
        const r = Number(f.rating);
        return f.rating != null && (isNaN(r) || r < 1 || r > 5);
    });
    if (invalidRatings.length) {
        issues.push({
            severity: 'high',
            title: 'Invalid rating values',
            desc: 'Ratings must be between 1 and 5.',
            count: invalidRatings.length,
            ids: invalidRatings.slice(0, 5).map((f) => f.id).join(', ')
        });
    }

    /* 2. Missing reel reference */
    const reelIds = new Set(savedReels.map((r) => r.id));
    const orphanRefs = allFeedback.filter((f) => f.reelId && !reelIds.has(f.reelId));
    if (orphanRefs.length) {
        issues.push({
            severity: 'medium',
            title: 'Feedback references missing reels',
            desc: 'Some feedback points to reels that no longer exist.',
            count: orphanRefs.length,
            ids: orphanRefs.slice(0, 5).map((f) => f.id).join(', ')
        });
    }

    /* 3. Missing reel ID */
    const noReelId = allFeedback.filter((f) => !f.reelId);
    if (noReelId.length) {
        issues.push({
            severity: 'high',
            title: 'Feedback with no reel reference',
            desc: 'These responses cannot be attributed to any reel.',
            count: noReelId.length,
            ids: noReelId.slice(0, 5).map((f) => f.id).join(', ')
        });
    }

    /* 4. Missing timestamps */
    const noTimestamp = allFeedback.filter((f) => !f.submittedAt);
    if (noTimestamp.length) {
        issues.push({
            severity: 'medium',
            title: 'Feedback with missing timestamp',
            desc: 'These responses cannot be placed in the time sequence.',
            count: noTimestamp.length,
            ids: noTimestamp.slice(0, 5).map((f) => f.id).join(', ')
        });
    }

    /* 5. Future timestamps (suspicious) */
    const now = Date.now();
    const futureTs = allFeedback.filter((f) => {
        const t = new Date(f.submittedAt).getTime();
        return !isNaN(t) && t > now + 60000;
    });
    if (futureTs.length) {
        issues.push({
            severity: 'high',
            title: 'Feedback with future timestamps',
            desc: 'Timestamp is ahead of current time — possible clock or data issue.',
            count: futureTs.length,
            ids: futureTs.slice(0, 5).map((f) => f.id).join(', ')
        });
    }

    /* 6. Duplicate submissions (same reel + same timestamp rounded to minute + same rating) */
    const seen = {};
    const duplicates = [];
    allFeedback.forEach((f) => {
        if (!f.reelId || !f.submittedAt) return;
        const t = new Date(f.submittedAt).getTime();
        if (isNaN(t)) return;
        const key = f.reelId + '|' + Math.floor(t / 60000) + '|' + (f.rating || '');
        if (seen[key]) {
            duplicates.push(f.id);
        } else {
            seen[key] = true;
        }
    });
    if (duplicates.length) {
        issues.push({
            severity: 'low',
            title: 'Potential duplicate submissions',
            desc: 'Same reel, same minute, same rating — worth reviewing.',
            count: duplicates.length,
            ids: duplicates.slice(0, 5).join(', ')
        });
    }

    /* 7. Empty feedback (no answers selected) */
    const empties = allFeedback.filter((f) => {
        return !f.rating && !f.feeling && !f.stoodOut && !f.heldInterest &&
               !f.presentation && !f.improve && !f.wantMore && !f.engageAgain &&
               !f.likedPart && !f.message;
    });
    if (empties.length) {
        issues.push({
            severity: 'medium',
            title: 'Completely empty submissions',
            desc: 'No answers and no written feedback — likely abandoned forms.',
            count: empties.length,
            ids: empties.slice(0, 5).map((f) => f.id).join(', ')
        });
    }

    /* Summary stats */
    const totalIssues = issues.reduce((s, i) => s + i.count, 0);
    const qualityScore = totalRecords
        ? Math.max(0, Math.round(((totalRecords - totalIssues) / totalRecords) * 100))
        : 100;

    summaryEl.innerHTML = `
        <div class="quality-stat ${qualityScore >= 95 ? 'quality-stat--good' : qualityScore >= 80 ? 'quality-stat--warn' : 'quality-stat--bad'}">
            <span class="quality-stat-value">${qualityScore}%</span>
            <span class="quality-stat-label">Data Quality</span>
        </div>
        <div class="quality-stat">
            <span class="quality-stat-value">${totalRecords}</span>
            <span class="quality-stat-label">Total Records</span>
        </div>
        <div class="quality-stat ${totalIssues === 0 ? 'quality-stat--good' : 'quality-stat--warn'}">
            <span class="quality-stat-value">${totalIssues}</span>
            <span class="quality-stat-label">Issues Found</span>
        </div>
        <div class="quality-stat">
            <span class="quality-stat-value">${issues.length}</span>
            <span class="quality-stat-label">Issue Types</span>
        </div>
    `;

    if (!issues.length) {
        listEl.innerHTML = `<div class="chart-empty"><p>No data quality issues detected.</p></div>`;
        return;
    }

    listEl.innerHTML = issues.map((i) => `
        <div class="quality-issue-row">
            <div class="quality-issue-sev quality-issue-sev--${i.severity}"></div>
            <div class="quality-issue-body">
                <div class="quality-issue-title">${escapeHTML(i.title)}</div>
                <div class="quality-issue-desc">${escapeHTML(i.desc)}</div>
                ${i.ids ? `<div class="quality-issue-ids">IDs: ${escapeHTML(i.ids)}${i.count > 5 ? ' …' : ''}</div>` : ''}
            </div>
            <div class="quality-issue-count">${i.count}</div>
        </div>
    `).join('');
}
/* ============================================================
   RENDER — ANOMALY DETECTION
   ============================================================ */
function renderAnomaly() {
    const summaryEl = $('anomalySummary');
    const listEl = $('anomalyIssues');
    if (!summaryEl || !listEl) return;

    const issues = [];
    const now = Date.now();
    const day = 86400000;
    const last7 = allFeedback.filter((f) => {
        const t = new Date(f.submittedAt).getTime();
        return !isNaN(t) && t > now - 7 * day;
    });

    /* 1. Rapid-fire submissions: 5+ feedbacks within 60 seconds */
    const sorted = [...allFeedback].sort((a, b) => {
        const ta = new Date(a.submittedAt).getTime();
        const tb = new Date(b.submittedAt).getTime();
        return ta - tb;
    });
    const rapidGroups = [];
    let window = [];
    sorted.forEach((f) => {
        const t = new Date(f.submittedAt).getTime();
        if (isNaN(t)) return;
        window = window.filter((w) => t - new Date(w.submittedAt).getTime() < 60000);
        window.push(f);
        if (window.length >= 5) {
            /* Check if this window is already captured */
            const lastGroup = rapidGroups[rapidGroups.length - 1];
            if (!lastGroup || lastGroup[0].id !== window[0].id) {
                rapidGroups.push([...window]);
            }
        }
    });
    if (rapidGroups.length) {
        const ids = rapidGroups.flat().map((f) => f.id).slice(0, 8);
        issues.push({
            severity: 'high',
            title: 'Rapid-fire submission clusters',
            desc: `${rapidGroups.length} cluster${rapidGroups.length === 1 ? '' : 's'} of 5+ submissions within 60 seconds. Possible bot or repeated manual testing.`,
            count: rapidGroups.flat().length,
            ids: ids.join(', ')
        });
    }

    /* 2. Identical answers: same 5+ answers on same reel from same "device" */
    const combos = {};
    allFeedback.forEach((f) => {
        if (!f.reelId) return;
        const key = [
            f.reelId,
            f.rating || '',
            f.feeling || '',
            f.stoodOut || '',
            f.heldInterest || '',
            f.presentation || '',
            f.improve || '',
            f.wantMore || '',
            f.engageAgain || '',
            f.likedPart || ''
        ].join('|');
        /* Only consider if at least 3 answers present */
        const answerCount = [f.rating, f.feeling, f.stoodOut, f.heldInterest, f.presentation, f.improve, f.wantMore, f.engageAgain, f.likedPart]
            .filter((v) => v != null && v !== '').length;
        if (answerCount < 3) return;
        if (!combos[key]) combos[key] = [];
        combos[key].push(f.id);
    });
    const identicalGroups = Object.values(combos).filter((g) => g.length >= 5);
    if (identicalGroups.length) {
        const ids = identicalGroups.flat().slice(0, 8);
        issues.push({
            severity: 'high',
            title: 'Identical answer patterns',
            desc: `${identicalGroups.length} combination${identicalGroups.length === 1 ? '' : 's'} of identical answers repeated 5+ times.`,
            count: identicalGroups.flat().length,
            ids: ids.join(', ')
        });
    }

    /* 3. Off-hours burst: 10+ submissions between 2 AM – 5 AM IST in last 7 days */
    const offHours = last7.filter((f) => {
        const d = new Date(f.submittedAt);
        const h = d.getHours();
        return h >= 2 && h < 5;
    });
    if (offHours.length >= 10) {
        issues.push({
            severity: 'medium',
            title: 'Off-hours submission burst',
            desc: `${offHours.length} submissions between 2 AM–5 AM in the last 7 days. Unusual for organic audience.`,
            count: offHours.length,
            ids: offHours.slice(0, 8).map((f) => f.id).join(', ')
        });
    }

    /* 4. Same-minute duplicate from same reel */
    const minuteMap = {};
    allFeedback.forEach((f) => {
        if (!f.reelId || !f.submittedAt) return;
        const t = new Date(f.submittedAt).getTime();
        if (isNaN(t)) return;
        const key = f.reelId + '|' + Math.floor(t / 60000);
        if (!minuteMap[key]) minuteMap[key] = [];
        minuteMap[key].push(f.id);
    });
    const minuteDupes = Object.values(minuteMap).filter((g) => g.length >= 3);
    if (minuteDupes.length) {
        issues.push({
            severity: 'medium',
            title: 'Multiple submissions in same minute',
            desc: `${minuteDupes.length} minute${minuteDupes.length === 1 ? '' : 's'} where 3+ feedbacks landed on the same reel.`,
            count: minuteDupes.flat().length,
            ids: minuteDupes.flat().slice(0, 8).join(', ')
        });
    }

    /* 5. Very short completion with max ratings: possible bot */
    const botPattern = allFeedback.filter((f) => {
        const answerCount = [f.rating, f.feeling, f.stoodOut, f.heldInterest, f.presentation, f.improve, f.wantMore, f.engageAgain, f.likedPart]
            .filter((v) => v != null && v !== '').length;
        const allMax = Number(f.rating) === 5
            && (f.presentation || '').toLowerCase().startsWith('excellent')
            && (f.heldInterest || '').toLowerCase().startsWith('yes, completely')
            && (f.engageAgain || '').toLowerCase().startsWith('very likely');
        return allMax && answerCount >= 5;
    });
    if (botPattern.length >= 5) {
        issues.push({
            severity: 'medium',
            title: 'Uniform maximum-rating submissions',
            desc: `${botPattern.length} submissions with all positive/maximum answers. Could be genuine enthusiasm or coordinated activity.`,
            count: botPattern.length,
            ids: botPattern.slice(0, 8).map((f) => f.id).join(', ')
        });
    }

    /* Summary */
    const totalFlagged = new Set(issues.flatMap((i) => i.ids.split(', ').filter(Boolean))).size;
    const totalFeedback = allFeedback.length;
    const anomalyRate = totalFeedback ? Math.round((totalFlagged / totalFeedback) * 100) : 0;

    summaryEl.innerHTML = `
        <div class="quality-stat ${issues.length === 0 ? 'quality-stat--good' : 'quality-stat--warn'}">
            <span class="quality-stat-value">${issues.length}</span>
            <span class="quality-stat-label">Anomaly Types</span>
        </div>
        <div class="quality-stat">
            <span class="quality-stat-value">${totalFlagged}</span>
            <span class="quality-stat-label">Flagged Records</span>
        </div>
        <div class="quality-stat">
            <span class="quality-stat-value">${totalFeedback}</span>
            <span class="quality-stat-label">Total Feedback</span>
        </div>
        <div class="quality-stat ${anomalyRate >= 10 ? 'quality-stat--bad' : anomalyRate >= 5 ? 'quality-stat--warn' : 'quality-stat--good'}">
            <span class="quality-stat-value">${anomalyRate}%</span>
            <span class="quality-stat-label">Anomaly Rate</span>
        </div>
    `;

    if (!issues.length) {
        listEl.innerHTML = `<div class="chart-empty"><p>No suspicious patterns detected.</p></div>`;
        return;
    }

    listEl.innerHTML = issues.map((i) => `
        <div class="quality-issue-row">
            <div class="quality-issue-sev quality-issue-sev--${i.severity}"></div>
            <div class="quality-issue-body">
                <div class="quality-issue-title">${escapeHTML(i.title)}</div>
                <div class="quality-issue-desc">${escapeHTML(i.desc)}</div>
                ${i.ids ? `<div class="quality-issue-ids">IDs: ${escapeHTML(i.ids)}${i.count > 8 ? ' …' : ''}</div>` : ''}
            </div>
            <div class="quality-issue-count">${i.count}</div>
        </div>
    `).join('');
}
/* ============================================================
   RENDER — REEL COMPARISON LAB
   ============================================================ */
function renderReelComparisonLab() {
    const chipsEl = $('compareLabChips');
    const resultEl = $('compareLabResult');
    if (!chipsEl || !resultEl) return;

    if (!savedReels.length) {
        chipsEl.innerHTML = '';
        resultEl.innerHTML = `<div class="chart-empty"><p>No reels to compare.</p></div>`;
        return;
    }

    /* Chips */
    chipsEl.innerHTML = savedReels.map((r) => `
        <button type="button" class="compare-lab-chip${compareLabSelection.has(r.id) ? ' is-active' : ''}" data-id="${escapeHTML(r.id)}">
            ${escapeHTML(r.id)}
        </button>
    `).join('');

    chipsEl.querySelectorAll('.compare-lab-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const id = chip.dataset.id;
            if (compareLabSelection.has(id)) {
                compareLabSelection.delete(id);
            } else {
                if (compareLabSelection.size >= 4) {
                    alert('Maximum 4 reels can be compared.');
                    return;
                }
                compareLabSelection.add(id);
            }
            renderReelComparisonLab();
        });
    });

    if (compareLabSelection.size < 2) {
        resultEl.innerHTML = `<div class="chart-empty"><p>Select at least 2 reels to compare.</p></div>`;
        return;
    }

    const range = periodRange(currentPeriod);
    const ids = Array.from(compareLabSelection);
    const rows = ids.map((id) => {
        const reel = savedReels.find((r) => r.id === id);
        return { id, title: reel?.title || '', stats: computeReelStats(id, range) };
    });

    /* Metrics to compare */
    const metrics = [
        { label: 'Responses', get: (s) => s ? s.total : 0, numeric: true },
        { label: 'Avg Rating', get: (s) => s ? Number(s.avg.toFixed(2)) : 0, display: (s) => s ? s.avg.toFixed(2) + '/5' : '—', numeric: true },
        { label: 'Recommendation', get: (s) => s ? s.recommend : 0, display: (s) => s ? s.recommend + '%' : '—', numeric: true },
        { label: 'Repeat Intent', get: (s) => s ? s.repeat : 0, display: (s) => s ? s.repeat + '%' : '—', numeric: true },
        { label: 'Written Feedback', get: (s) => s ? s.written : 0, numeric: true },
        { label: 'Confidence', get: (s) => s ? s.confidence.level : '—', numeric: false },
        { label: 'Classification', get: (s) => s ? classifyReel(s).label : 'Insufficient Data', numeric: false }
    ];

    /* Find best/worst per numeric metric */
    const bestWorst = {};
    metrics.forEach((m) => {
        if (!m.numeric) return;
        const values = rows.map((r) => m.get(r.stats));
        const valid = values.filter((v) => v != null && !isNaN(v));
        if (!valid.length) return;
        bestWorst[m.label] = { best: Math.max(...valid), worst: Math.min(...valid) };
    });

    let table = '<table class="compare-lab-table"><thead><tr><th>Metric</th>';
    rows.forEach((r) => { table += `<th>${escapeHTML(r.id)}</th>`; });
    table += '</tr></thead><tbody>';

    metrics.forEach((m) => {
        table += `<tr><td>${escapeHTML(m.label)}</td>`;
        rows.forEach((r) => {
            const v = m.get(r.stats);
            const display = m.display ? m.display(r.stats) : (v == null ? '—' : String(v));
            let cls = '';
            if (m.numeric && bestWorst[m.label] && rows.length > 1) {
                const nums = rows.map((rr) => m.get(rr.stats));
                const best = bestWorst[m.label].best;
                const worst = bestWorst[m.label].worst;
                if (best !== worst) {
                    if (v === best) cls = 'best';
                    else if (v === worst) cls = 'worst';
                }
            }
            table += `<td class="${cls}">${escapeHTML(display)}</td>`;
        });
        table += '</tr>';
    });
    table += '</tbody></table>';

    /* Auto-generated summary */
    const summary = [];
    const ratedRows = rows.filter((r) => r.stats && r.stats.total >= settings.minSample);
    if (ratedRows.length >= 2) {
        const best = ratedRows.slice().sort((a, b) => b.stats.avg - a.stats.avg)[0];
        const worst = ratedRows.slice().sort((a, b) => a.stats.avg - b.stats.avg)[0];
        summary.push(`<div><strong>Strongest:</strong> ${escapeHTML(best.id)} — avg rating ${best.stats.avg.toFixed(2)}/5 with ${best.stats.recommend}% recommendation.</div>`);
        if (best.id !== worst.id) {
            summary.push(`<div><strong>Weakest:</strong> ${escapeHTML(worst.id)} — avg rating ${worst.stats.avg.toFixed(2)}/5 with ${worst.stats.recommend}% recommendation.</div>`);
        }

        /* Shared recommend / repeat leaders */
        const recLeader = ratedRows.slice().sort((a, b) => b.stats.recommend - a.stats.recommend)[0];
        if (recLeader.id !== best.id) {
            summary.push(`<div><strong>Highest recommendation:</strong> ${escapeHTML(recLeader.id)} at ${recLeader.stats.recommend}%.</div>`);
        }
        const repLeader = ratedRows.slice().sort((a, b) => b.stats.repeat - a.stats.repeat)[0];
        summary.push(`<div><strong>Highest repeat intent:</strong> ${escapeHTML(repLeader.id)} at ${repLeader.stats.repeat}%.</div>`);
    } else {
        summary.push('<div>Not enough data in the current period to make reliable comparisons. Sample size below minimum threshold for at least 2 reels.</div>');
    }

    resultEl.innerHTML = table + `<div class="compare-lab-summary">${summary.join('')}</div>`;
}

/* ============================================================
   RENDER — EXPERIMENT INTELLIGENCE
   ============================================================ */
function renderExperiment() {
    const chipsA = $('experimentChipsA');
    const chipsB = $('experimentChipsB');
    const resultEl = $('experimentResult');
    if (!chipsA || !chipsB || !resultEl) return;

    if (!savedReels.length) {
        chipsA.innerHTML = '';
        chipsB.innerHTML = '';
        resultEl.innerHTML = `<div class="chart-empty"><p>Add reels to enable experiments.</p></div>`;
        return;
    }

    /* Chips for Group A */
    chipsA.innerHTML = savedReels.map((r) => `
        <button type="button" class="experiment-chip${experimentGroupA.has(r.id) ? ' is-active' : ''}" data-group="A" data-id="${escapeHTML(r.id)}">
            ${escapeHTML(r.id)}
        </button>
    `).join('');

    /* Chips for Group B */
    chipsB.innerHTML = savedReels.map((r) => `
        <button type="button" class="experiment-chip${experimentGroupB.has(r.id) ? ' is-active in-group-b' : ''}" data-group="B" data-id="${escapeHTML(r.id)}">
            ${escapeHTML(r.id)}
        </button>
    `).join('');

    /* Bind */
    [chipsA, chipsB].forEach((el) => {
        el.querySelectorAll('.experiment-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                const id = chip.dataset.id;
                const group = chip.dataset.group;
                const set = group === 'A' ? experimentGroupA : experimentGroupB;
                const other = group === 'A' ? experimentGroupB : experimentGroupA;
                if (set.has(id)) {
                    set.delete(id);
                } else {
                    if (other.has(id)) other.delete(id);
                    set.add(id);
                }
                renderExperiment();
            });
        });
    });

    if (experimentGroupA.size < 1 || experimentGroupB.size < 1) {
        resultEl.innerHTML = `<div class="chart-empty"><p>Select at least 1 reel in each group.</p></div>`;
        return;
    }

    /* Compute aggregate stats for each group */
    const range = periodRange(currentPeriod);

    const computeGroup = (ids) => {
        const feedbackList = allFeedback.filter((f) => {
            if (!ids.has(f.reelId)) return false;
            if (!inRange(f.submittedAt, range.start, range.end)) return false;
            return true;
        });
        return { feedbackList, metrics: calcMetrics(feedbackList) };
    };

    const groupA = computeGroup(experimentGroupA);
    const groupB = computeGroup(experimentGroupB);
    const mA = groupA.metrics;
    const mB = groupB.metrics;

    /* Determine significance threshold */
    const minSample = settings.minSample;
    const hasEnoughA = mA.total >= minSample;
    const hasEnoughB = mB.total >= minSample;
    const hasBoth = hasEnoughA && hasEnoughB;

    /* Rows */
    const metrics = [
        { label: 'Responses', a: mA.total, b: mB.total, higherIsBetter: true },
        { label: 'Avg Rating', a: Number(mA.avgRating.toFixed(2)), b: Number(mB.avgRating.toFixed(2)), display: (v) => v.toFixed(2), higherIsBetter: true },
        { label: 'Satisfaction', a: mA.satisfaction, b: mB.satisfaction, display: (v) => v + '%', higherIsBetter: true },
        { label: 'Recommendation', a: mA.recommend, b: mB.recommend, display: (v) => v + '%', higherIsBetter: true },
        { label: 'Future Interest', a: mA.future, b: mB.future, display: (v) => v + '%', higherIsBetter: true },
        { label: 'Repeat Intent', a: mA.repeat, b: mB.repeat, display: (v) => v + '%', higherIsBetter: true },
        { label: 'Health Score', a: mA.healthScore, b: mB.healthScore, display: (v) => String(v), higherIsBetter: true }
    ];

    let table = '<table class="experiment-table"><thead><tr><th>Metric</th><th>Group A</th><th>Group B</th></tr></thead><tbody>';
    metrics.forEach((m) => {
        const aVal = m.a;
        const bVal = m.b;
        let clsA = '', clsB = '';
        if (hasBoth && aVal !== bVal) {
            const aWins = m.higherIsBetter ? aVal > bVal : aVal < bVal;
            clsA = aWins ? 'win-a' : '';
            clsB = aWins ? '' : 'win-b';
        }
        const dispA = m.display ? m.display(aVal) : String(aVal);
        const dispB = m.display ? m.display(bVal) : String(bVal);
        table += `<tr><td>${escapeHTML(m.label)}</td><td class="${clsA}">${escapeHTML(dispA)}</td><td class="${clsB}">${escapeHTML(dispB)}</td></tr>`;
    });
    table += '</tbody></table>';

    /* Verdict */
    let verdict, verdictCls;
    if (!hasBoth) {
        verdict = `Insufficient evidence. Group A has ${mA.total} responses, Group B has ${mB.total}. Minimum ${minSample} required in each group for a reliable comparison.`;
        verdictCls = 'insufficient';
    } else {
        const aHealth = mA.healthScore;
        const bHealth = mB.healthScore;
        const diff = bHealth - aHealth;
        const threshold = settings.significantChange;
        if (Math.abs(diff) < threshold) {
            verdict = `No meaningful difference. Health scores are ${aHealth} vs ${bHealth} (${diff >= 0 ? '+' : ''}${diff}), within the ${threshold}-point significance threshold.`;
            verdictCls = 'tie';
        } else if (diff > 0) {
            verdict = `Group B performs better by ${diff} health-score points (${bHealth} vs ${aHealth}). Evidence supports Group B as the stronger pattern.`;
            verdictCls = 'b-wins';
        } else {
            verdict = `Group A performs better by ${Math.abs(diff)} health-score points (${aHealth} vs ${bHealth}). Evidence supports Group A as the stronger pattern.`;
            verdictCls = 'a-wins';
        }
    }

    /* Notes */
    const notes = [];
    notes.push(`Group A contains ${experimentGroupA.size} reel${experimentGroupA.size === 1 ? '' : 's'}: ${Array.from(experimentGroupA).join(', ')}.`);
    notes.push(`Group B contains ${experimentGroupB.size} reel${experimentGroupB.size === 1 ? '' : 's'}: ${Array.from(experimentGroupB).join(', ')}.`);
    notes.push(`Period: ${currentPeriod}. Significance threshold: ${settings.significantChange} points.`);

    resultEl.innerHTML = `
        <div class="experiment-verdict experiment-verdict--${verdictCls}">
            ${escapeHTML(verdict)}
        </div>
        ${table}
        <div class="experiment-notes">${notes.map(escapeHTML).join('<br>')}</div>
    `;
}

/* ============================================================
   RENDER — INSIGHT LIFECYCLE
   ============================================================ */
function renderLifecycle() {
    const listEl = $('lifecycleList');
    const emptyEl = $('lifecycleEmpty');
    if (!listEl || !emptyEl) return;

    /* Need at least 2 snapshots to determine a trend */
    const sorted = [...snapshots].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    if (sorted.length < 2) {
        emptyEl.hidden = false;
        listEl.hidden = true;
        return;
    }
    emptyEl.hidden = true;
    listEl.hidden = false;

    /* Take up to last 5 snapshots */
    const recent = sorted.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];

    /* Metrics tracked */
    const metrics = [
        { key: 'healthScore', name: 'Content Health Score' },
        { key: 'satisfaction', name: 'Satisfaction' },
        { key: 'recommend', name: 'Recommendation' },
        { key: 'future', name: 'Future Interest' },
        { key: 'repeat', name: 'Repeat Intent' }
    ];

    const rows = metrics.map((m) => {
        const values = recent
            .map((s) => Number(s[m.key]))
            .filter((v) => !isNaN(v));

        if (values.length < 2) return null;

        const start = values[0];
        const end = values[values.length - 1];
        const diff = end - start;
        const magnitude = Math.abs(diff);
        const threshold = settings.significantChange || 10;

        /* Determine trajectory */
        let state, arrow, trend;
        if (magnitude < threshold * 0.5) {
            state = 'Confirmed';
            arrow = 'flat';
            trend = 'Stable across recent snapshots.';
        } else if (diff > 0 && start < 60) {
            state = 'Emerging';
            arrow = 'up';
            trend = 'Early positive movement.';
        } else if (diff > 0 && magnitude < threshold * 2) {
            state = 'Strengthening';
            arrow = 'up';
            trend = 'Consistent improvement across snapshots.';
        } else if (diff > 0) {
            state = 'Strengthening';
            arrow = 'up';
            trend = 'Strong upward trend confirmed.';
        } else if (diff < 0 && end > settings.poorRating * 20) {
            state = 'Weakening';
            arrow = 'down';
            trend = 'Declining but still above poor-performance floor.';
        } else {
            state = 'Unsupported';
            arrow = 'down';
            trend = 'Declining into unsupported territory.';
        }

        return {
            name: m.name,
            state, arrow, trend,
            values: values.map((v) => Math.round(v)),
            diff
        };
    }).filter(Boolean);

    if (!rows.length) {
        listEl.innerHTML = `<div class="chart-empty"><p>Not enough stable metrics to classify lifecycle.</p></div>`;
        return;
    }

    listEl.innerHTML = rows.map((r) => `
        <div class="lifecycle-row">
            <div class="lifecycle-body">
                <div class="lifecycle-name">${escapeHTML(r.name)}</div>
                <div class="lifecycle-trend">${escapeHTML(r.trend)}</div>
                <div class="lifecycle-values">
                    ${r.values.map((v) => `<span>${v}</span>`).join('')}
                    <span>Δ ${r.diff > 0 ? '+' : ''}${Math.round(r.diff)}</span>
                </div>
            </div>
            <div class="lifecycle-arrow lifecycle-arrow--${r.arrow}">
                ${r.arrow === 'up' ? '↑' : r.arrow === 'down' ? '↓' : '→'}
            </div>
            <div class="lifecycle-state lifecycle-state--${r.state.toLowerCase()}">
                ${escapeHTML(r.state)}
            </div>
        </div>
    `).join('');
}

/* ============================================================
   RENDER — ASK YOUR DATA
   ============================================================ */
const ASK_QUESTIONS = [
    { id: 'best', q: 'Which reel performed best this period?' },
    { id: 'worst', q: 'Which reel needs attention?' },
    { id: 'why_decline', q: 'Why is performance declining?' },
    { id: 'repeat', q: 'What should I repeat?' },
    { id: 'improve', q: 'What should I improve?' },
    { id: 'wants', q: 'What content is the audience asking for?' },
    { id: 'pattern', q: 'Which content pattern is strongest?' },
    { id: 'changed', q: 'What changed in the last 30 days?' }
];

function renderAskGrid() {
    const wrap = $('askGridAudit');
    if (!wrap) return;
    wrap.innerHTML = ASK_QUESTIONS.map((q) => `
        <button type="button" class="ask-btn" data-ask="${q.id}">${escapeHTML(q.q)}</button>
    `).join('');
    wrap.querySelectorAll('.ask-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            wrap.querySelectorAll('.ask-btn').forEach((b) => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            answerAsk(btn.dataset.ask);
        });
    });
    const resp = $('askResponseAudit');
    if (resp) resp.textContent = 'Select a question to get an evidence-based answer.';
}

function answerAsk(id) {
    const resp = $('askResponseAudit');
    if (!resp) return;
    const range = periodRange(currentPeriod);
    const list = filterFeedback(allFeedback, range, currentReelFilter);
    if (!list.length) {
        resp.textContent = 'No data available for the current period.';
        return;
    }
    const c = calcMetrics(list);

    if (id === 'best') {
        const best = savedReels.map((r) => ({ id: r.id, stats: computeReelStats(r.id, range) }))
            .filter((x) => x.stats && x.stats.total >= settings.minSample)
            .sort((a, b) => b.stats.avg - a.stats.avg)[0];
        resp.textContent = best
            ? `${best.id} performed best with avg rating ${best.stats.avg.toFixed(1)}/5 and ${best.stats.recommend}% recommendation across ${best.stats.total} responses.`
            : 'Insufficient data to determine best performer.';
        return;
    }
    if (id === 'worst') {
        const worst = savedReels.map((r) => ({ id: r.id, stats: computeReelStats(r.id, range) }))
            .filter((x) => x.stats && x.stats.total >= settings.minSample)
            .sort((a, b) => a.stats.avg - b.stats.avg)[0];
        resp.textContent = worst
            ? `${worst.id} is weakest with avg rating ${worst.stats.avg.toFixed(1)}/5 across ${worst.stats.total} responses.`
            : 'Insufficient data to determine weakest performer.';
        return;
    }
    if (id === 'why_decline') {
        const prev = filterFeedback(allFeedback, previousPeriodRange(currentPeriod), currentReelFilter);
        if (!prev.length) { resp.textContent = 'No prior-period data to compare.'; return; }
        const p = calcMetrics(prev);
        const dS = c.satisfaction - p.satisfaction;
        resp.textContent = Math.abs(dS) < settings.significantChange
            ? 'No significant decline detected in the current period.'
            : `Satisfaction dropped ${Math.abs(dS)} points (${c.satisfaction}% vs ${p.satisfaction}%). Investigate recent reels for changed characteristics.`;
        return;
    }
    if (id === 'repeat') {
        const recos = buildRecommendations().filter((r) => r.category === 'Repeat');
        resp.textContent = recos.length
            ? recos.map((r) => r.action).join(' ')
            : 'No clear repeat action identified yet.';
        return;
    }
    if (id === 'improve') {
        const recos = buildRecommendations().filter((r) => r.category === 'Improve');
        resp.textContent = recos.length
            ? recos.map((r) => r.action).join(' ')
            : 'No clear improvement action identified yet.';
        return;
    }
    if (id === 'wants') {
        const wants = {};
        list.forEach((f) => {
            const k = (f.wantMore || '').trim();
            if (k) wants[k] = (wants[k] || 0) + 1;
        });
        const top = Object.entries(wants).sort((a, b) => b[1] - a[1]).slice(0, 3);
        resp.textContent = top.length
            ? `Top requests: ${top.map(([k, v]) => `"${k}" (${v})`).join(', ')}.`
            : 'No content preference data yet.';
        return;
    }
    if (id === 'pattern') {
        const feelings = {};
        list.forEach((f) => {
            const k = (f.feeling || '').trim();
            if (k) feelings[k] = (feelings[k] || 0) + 1;
        });
        const top = Object.entries(feelings).sort((a, b) => b[1] - a[1])[0];
        resp.textContent = top
            ? `Strongest observed pattern: content that evokes "${top[0]}" — appears in ${pct(top[1], list.length)}% of responses.`
            : 'Insufficient data to determine strongest pattern.';
        return;
    }
    if (id === 'changed') {
        const last30 = filterFeedback(allFeedback, { start: Date.now() - 30 * 86400000, end: Date.now() }, currentReelFilter);
        resp.textContent = last30.length
            ? `${last30.length} responses in last 30 days. Average rating: ${(last30.reduce((s, f) => s + Number(f.rating || 0), 0) / last30.length).toFixed(1)}/5.`
            : 'No responses in the last 30 days.';
        return;
    }
    resp.textContent = 'Unable to answer with current data.';
}

/* ============================================================
   SETTINGS
   ============================================================ */
function fillSettingsForm() {
    $('minSample').value = settings.minSample;
    $('strongSample').value = settings.strongSample;
    $('goodRating').value = settings.goodRating;
    $('poorRating').value = settings.poorRating;
    $('significantChange').value = settings.significantChange;
    $('weightRating').value = settings.weightRating;
    $('weightRecommend').value = settings.weightRecommend;
    $('weightFuture').value = settings.weightFuture;
    $('weightRepeat').value = settings.weightRepeat;
}
function readSettingsForm() {
    const num = (id, fallback) => {
        const v = Number($(id).value);
        return isNaN(v) ? fallback : v;
    };
    return {
        minSample: Math.max(1, num('minSample', DEFAULT_SETTINGS.minSample)),
        strongSample: Math.max(1, num('strongSample', DEFAULT_SETTINGS.strongSample)),
        goodRating: Math.min(5, Math.max(1, num('goodRating', DEFAULT_SETTINGS.goodRating))),
        poorRating: Math.min(5, Math.max(1, num('poorRating', DEFAULT_SETTINGS.poorRating))),
        significantChange: Math.max(1, num('significantChange', DEFAULT_SETTINGS.significantChange)),
        weightRating: Math.max(0, num('weightRating', DEFAULT_SETTINGS.weightRating)),
        weightRecommend: Math.max(0, num('weightRecommend', DEFAULT_SETTINGS.weightRecommend)),
        weightFuture: Math.max(0, num('weightFuture', DEFAULT_SETTINGS.weightFuture)),
        weightRepeat: Math.max(0, num('weightRepeat', DEFAULT_SETTINGS.weightRepeat))
    };
}

async function saveSettings() {
    const note = $('settingsNote');
    const s = readSettingsForm();
    try {
        await set(ref(db, 'auditSettings'), s);
        settings = s;
        if (note) { note.textContent = 'Settings saved. Recalculating…'; note.style.color = '#1d7a3d'; }
        renderAll();
        setTimeout(() => { if (note) note.textContent = 'Settings saved.'; }, 1500);
    } catch (err) {
        console.error('Save settings error:', err);
        if (note) { note.textContent = 'Failed to save settings.'; note.style.color = '#b03030'; }
    }
}

/* ============================================================
   SNAPSHOT
   ============================================================ */
async function saveSnapshot() {
    const range = periodRange(currentPeriod);
    const list = filterFeedback(allFeedback, range, currentReelFilter);
    const c = calcMetrics(list);
    if (!c.total) {
        alert('No data to snapshot for the current period.');
        return;
    }
    const snapshot = {
        createdAt: Date.now(),
        period: currentPeriod,
        compareMode: currentCompare,
        reelFilter: currentReelFilter,
        responses: c.total,
        reels: savedReels.length,
        healthScore: c.healthScore,
        satisfaction: c.satisfaction,
        recommend: c.recommend,
        future: c.future,
        repeat: c.repeat,
        settings: { ...settings }
    };
    try {
        await push(ref(db, 'auditHistory'), snapshot);
        alert('Snapshot saved.');
    } catch (err) {
        console.error('Snapshot error:', err);
        alert('Failed to save snapshot.');
    }
}

/* ============================================================
   EXPORT — CSV
   ============================================================ */
function csvEscape(v) {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}
function downloadCSV(filename, rows) {
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportCSV() {
    const range = periodRange(currentPeriod);
    const list = filterFeedback(allFeedback, range, currentReelFilter);

    /* Main CSV: full records */
    const header = [
        'RecordType','ReelID','ReelTitle','ReelURL','Name','Email','Anonymous',
        'Rating','Feeling','WouldWatchMore','ConnectedWith','StoodOut','HeldInterest',
        'Presentation','Improve','WantMore','EngageAgain','LikedPart',
        'Message','SubmittedAtISO','SubmittedAtLocal'
    ];
    const rows = [header];

    /* All feedback records (unfiltered) — full export */
    allFeedback.forEach((f) => {
        const reel = savedReels.find((r) => r.id === f.reelId);
        rows.push([
            'feedback',
            f.reelId || '',
            reel?.title || f.reelTitle || '',
            reel?.url || '',
            f.name || 'Anonymous',
            f.email || '',
            f.isAnonymous ? 'yes' : 'no',
            f.rating || '',
            f.feeling || '',
            f.wouldWatchMore || f.more || '',
            f.connectedWith || '',
            f.stoodOut || '',
            f.heldInterest || '',
            f.presentation || '',
            f.improve || '',
            f.wantMore || '',
            f.engageAgain || '',
            f.likedPart || '',
            f.message || '',
            f.submittedAt ? new Date(f.submittedAt).toISOString() : '',
            f.submittedAt ? formatDate(f.submittedAt) : ''
        ]);
    });

    /* Append reel audit summary rows */
    savedReels.forEach((r) => {
        const stats = computeReelStats(r.id, range);
        if (!stats) return;
        rows.push([
            'reel_audit',
            r.id,
            r.title || '',
            r.url || '',
            '', '', '',
            stats.avg.toFixed(2),
            '', '', '', '', '', '', '', '', '', '',
            `Responses: ${stats.total}, Recommend: ${stats.recommend}%, Repeat: ${stats.repeat}%, Confidence: ${stats.confidence.level}`,
            '', ''
        ]);
    });

        const suffix = currentPeriod === 'custom'
        ? `${customRangeStart}_to_${customRangeEnd}`
        : currentPeriod;
    const filename = `rudrabhakti-audit-${suffix}-${new Date().toISOString().slice(0,10)}.csv`;
    downloadCSV(filename, rows);
}

/* ============================================================
   EXPORT — PDF (with captured charts)
   ============================================================ */
async function captureElement(el) {
    if (!el || !window.html2canvas) return null;
    try {
        const canvas = await window.html2canvas(el, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: el.scrollWidth,
            windowHeight: el.scrollHeight
        });
        return canvas.toDataURL('image/png');
    } catch (err) {
        console.warn('Chart capture failed:', err);
        return null;
    }
}

async function exportPDF() {
    if (!window.jspdf) {
        alert('PDF library not loaded.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 60;

    /* Header */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Rudra Bhakti — Content Audit & Analysis Report', pageW / 2, y, { align: 'center' });
    y += 22;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const genDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    doc.text(`Generated: ${genDate} IST`, pageW / 2, y, { align: 'center' });
    y += 14;
    doc.text(`Period: ${currentPeriod} · Compare: ${currentCompare} · Reel: ${currentReelFilter}`, pageW / 2, y, { align: 'center' });
    y += 30;

    const range = periodRange(currentPeriod);
    const list = filterFeedback(allFeedback, range, currentReelFilter);
    const c = calcMetrics(list);

    /* Executive Summary text */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Executive Summary', 40, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (!c.total) {
        doc.text('Insufficient data for a reliable insight.', 40, y);
        y += 14;
    } else {
        doc.text(`Content Health Score: ${c.healthScore}/100  (${c.confidence.level} confidence)`, 40, y); y += 14;
        doc.text(`Total Responses: ${c.total}   ·   Reels: ${savedReels.length}`, 40, y); y += 14;
        doc.text(`Satisfaction: ${c.satisfaction}%   ·   Recommendation: ${c.recommend}%`, 40, y); y += 14;
        doc.text(`Future Interest: ${c.future}%   ·   Repeat Intent: ${c.repeat}%`, 40, y); y += 14;
        doc.text(`Interest/Hold: ${c.hold}%   ·   Presentation: ${c.presentation}%`, 40, y); y += 14;
        doc.text(`Emotional Response: ${c.emotion}%   ·   Written Feedback: ${c.written}`, 40, y); y += 20;
    }

    /* Capture charts — Executive grid and summary */
    const execSection = document.getElementById('aud-executive');
    if (execSection) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        if (y > pageH - 300) { doc.addPage(); y = 60; }
        doc.text('Executive Dashboard Snapshot', 40, y);
        y += 16;

        const imgData = await captureElement(execSection);
        if (imgData) {
            const imgProps = doc.getImageProperties(imgData);
            const maxW = pageW - 80;
            const maxH = pageH - y - 60;
            const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
            const drawW = imgProps.width * ratio;
            const drawH = imgProps.height * ratio;

            if (y + drawH > pageH - 60) {
                doc.addPage();
                y = 60;
            }
            doc.addImage(imgData, 'PNG', 40, y, drawW, drawH);
            y += drawH + 20;
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text('(Dashboard image unavailable — see tables below)', 40, y);
            y += 20;
        }
    }

    /* Reel Table */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    if (y > pageH - 200) { doc.addPage(); y = 60; }
    doc.text('Reel Performance', 40, y);
    y += 16;

    const reelRows = savedReels.map((r) => {
        const s = computeReelStats(r.id, range);
        if (!s) return [r.id, (r.title || '').slice(0, 30), 0, '—', '—', '—', 'Insufficient'];
        return [
            r.id,
            (r.title || '').slice(0, 30),
            s.total,
            s.avg.toFixed(2),
            s.recommend + '%',
            s.repeat + '%',
            classifyReel(s).label
        ];
    });

    if (reelRows.length) {
        doc.autoTable({
            startY: y,
            head: [['Reel ID', 'Title', 'Resp', 'Avg Rating', 'Recommend', 'Repeat', 'Class']],
            body: reelRows,
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [32, 32, 32], textColor: 255 },
            margin: { left: 40, right: 40 }
        });
        y = doc.lastAutoTable.finalY + 20;
    } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('No reels available.', 40, y);
        y += 20;
    }

    /* Risk / Opportunity capture */
    const riskSection = document.getElementById('aud-risks');
    if (riskSection) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        if (y > pageH - 200) { doc.addPage(); y = 60; }
        doc.text('Risk Snapshot', 40, y);
        y += 16;

        const riskImg = await captureElement(riskSection);
        if (riskImg) {
            const imgProps = doc.getImageProperties(riskImg);
            const maxW = pageW - 80;
            const maxH = pageH - y - 60;
            const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
            const drawW = imgProps.width * ratio;
            const drawH = imgProps.height * ratio;

            if (y + drawH > pageH - 60) {
                doc.addPage();
                y = 60;
            }
            doc.addImage(riskImg, 'PNG', 40, y, drawW, drawH);
            y += drawH + 20;
        }
    }

    /* Recommendations Table */
    const recos = buildRecommendations();
    if (recos.length) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        if (y > pageH - 200) { doc.addPage(); y = 60; }
        doc.text('Recommendations', 40, y);
        y += 16;

        doc.autoTable({
            startY: y,
            head: [['Priority', 'Category', 'Finding', 'Action', 'Confidence']],
            body: recos.map((r) => [r.priority, r.category, r.finding, r.action, r.confidence]),
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [32, 32, 32], textColor: 255 },
            columnStyles: {
                2: { cellWidth: 150 },
                3: { cellWidth: 150 }
            },
            margin: { left: 40, right: 40 }
        });
        y = doc.lastAutoTable.finalY + 20;
    }

    /* Data Quality summary */
    const qualitySection = document.getElementById('aud-quality');
    if (qualitySection) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        if (y > pageH - 200) { doc.addPage(); y = 60; }
        doc.text('Data Quality', 40, y);
        y += 16;

        const qImg = await captureElement(qualitySection);
        if (qImg) {
            const imgProps = doc.getImageProperties(qImg);
            const maxW = pageW - 80;
            const maxH = pageH - y - 60;
            const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
            const drawW = imgProps.width * ratio;
            const drawH = imgProps.height * ratio;

            if (y + drawH > pageH - 60) {
                doc.addPage();
                y = 60;
            }
            doc.addImage(qImg, 'PNG', 40, y, drawW, drawH);
            y += drawH + 20;
        }
    }

    /* Footer on every page */
    const totalPages = doc.getNumberOfPages();
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text('Confidential — Rudra Bhakti internal audit report.', pageW / 2, pageH - 20, { align: 'center' });
        doc.text(`Page ${i} of ${totalPages}`, pageW - 40, pageH - 20, { align: 'right' });
    }

        const pdfSuffix = currentPeriod === 'custom'
        ? `${customRangeStart}_to_${customRangeEnd}`
        : currentPeriod;
    doc.save(`rudrabhakti-audit-${pdfSuffix}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
/* ============================================================
   RENDER — EVERYTHING
   ============================================================ */
function renderAll() {
    renderExecutive();
    renderReelAudit();
    renderPatterns();
    renderVoice();
    renderContradictions();
    renderRisks();
    renderOpportunities();
    renderPortfolio();
    renderRecommendations();
    renderRoadmap();
       renderHistory();
    renderQuality();
    renderLifecycle();
       renderOutcomes();
        renderReelComparisonLab();
    renderExperiment();
    renderAnomaly();
}
/* ============================================================
   AUTH
   ============================================================ */
function showLogin() {
    loginWrap.hidden = false;
    dash.hidden = true;
}
function showDash() {
    loginWrap.hidden = true;
    dash.hidden = false;
}

onAuthStateChanged(auth, (user) => {
        if (!user || user.uid !== ADMIN_UID) {
        if (user && user.uid !== ADMIN_UID) signOut(auth);
        clearSessionTimers();
        hideSessionModal();
        stopListeners();
        showLogin();
        return;
    }
        if (drawerUserEmail) drawerUserEmail.textContent = user.email || 'Administrator';
    showDash();
    startListeners();
    resetSessionTimers();
    attachSessionListeners();
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (!email || !password) {
        loginError.textContent = 'Please enter both email and password.';
        return;
    }
    loginLabel.textContent = 'Signing in…';
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        console.error('Login error:', err);
        let msg = 'Invalid email or password.';
        if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.';
        loginError.textContent = msg;
    } finally {
        loginLabel.textContent = 'Sign In';
    }
});
/* ============================================================
   SESSION TIMEOUT (30 min inactivity, warn at 28 min)
   ============================================================ */
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_WARN_MS = 28 * 60 * 1000;
const SESSION_COUNTDOWN_SEC = 120;

function clearSessionTimers() {
    if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
    if (sessionWarnTimer) { clearTimeout(sessionWarnTimer); sessionWarnTimer = null; }
    if (sessionCountdownInterval) { clearInterval(sessionCountdownInterval); sessionCountdownInterval = null; }
}

function hideSessionModal() {
    const modal = document.getElementById('sessionModal');
    if (modal) modal.hidden = true;
}

function showSessionModal() {
    const modal = document.getElementById('sessionModal');
    if (!modal) return;
    modal.hidden = false;

    let remaining = SESSION_COUNTDOWN_SEC;
    const countEl = document.getElementById('sessionCountdown');
    const updateCountdown = () => {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        if (countEl) countEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    };
    updateCountdown();

    sessionCountdownInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(sessionCountdownInterval);
            sessionCountdownInterval = null;
            performSessionLogout();
        } else {
            updateCountdown();
        }
    }, 1000);
}

async function performSessionLogout() {
    clearSessionTimers();
    hideSessionModal();
    try { await signOut(auth); } catch (err) { console.error(err); }
}

function resetSessionTimers() {
    clearSessionTimers();
    hideSessionModal();

    sessionWarnTimer = setTimeout(() => {
        showSessionModal();
    }, SESSION_WARN_MS);

    sessionTimer = setTimeout(() => {
        performSessionLogout();
    }, SESSION_IDLE_MS);
}

function attachSessionListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => {
        document.addEventListener(evt, resetSessionTimers, { passive: true });
    });
}

/* ============================================================
   LISTENERS
   ============================================================ */
function startListeners() {
    stopListeners();

    unsubReels = onValue(ref(db, 'reels'), (snap) => {
        savedReels = [];
        snap.forEach((child) => savedReels.push({ id: child.key, ...child.val() }));
        savedReels.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        populateReelFilter();
        renderAll();
    });

    unsubFeedback = onValue(ref(db, 'feedback'), (snap) => {
        allFeedback = [];
        snap.forEach((child) => {
            const v = child.val() || {};
            allFeedback.push({
                id: child.key,
                ...v,
                isAnonymous: !!v.isAnonymous || !v.name || v.name === 'Anonymous'
            });
        });
        renderAll();
    });

    unsubSettings = onValue(ref(db, 'auditSettings'), (snap) => {
        if (snap.exists()) {
            settings = { ...DEFAULT_SETTINGS, ...snap.val() };
        } else {
            settings = { ...DEFAULT_SETTINGS };
        }
        fillSettingsForm();
        renderAll();
    });

        unsubHistory = onValue(ref(db, 'auditHistory'), (snap) => {
        snapshots = [];
        snap.forEach((child) => snapshots.push({ id: child.key, ...child.val() }));
        renderHistory();
    });

    unsubRecoStatus = onValue(ref(db, 'auditRecos'), (snap) => {
        recoStatuses = {};
        snap.forEach((child) => {
            recoStatuses[child.key] = child.val() || {};
        });
        renderRecommendations();
        renderOutcomes();
    });
}

function stopListeners() {
    if (unsubReels) { unsubReels(); unsubReels = null; }
    if (unsubFeedback) { unsubFeedback(); unsubFeedback = null; }
    if (unsubSettings) { unsubSettings(); unsubSettings = null; }
       if (unsubHistory) { unsubHistory(); unsubHistory = null; }
    if (unsubRecoStatus) { unsubRecoStatus(); unsubRecoStatus = null; }
}
function populateReelFilter() {
    if (!reelFilter) return;
    const current = reelFilter.value;
    reelFilter.innerHTML = '<option value="all">All reels</option>' +
        savedReels.map((r) => `<option value="${escapeHTML(r.id)}">${escapeHTML(r.id)} — ${escapeHTML((r.title || '').slice(0, 30))}</option>`).join('');
    reelFilter.value = current || 'all';
}

/* ============================================================
   LOGOUT / DRAWER
   ============================================================ */
function openLogoutModal() {
    logoutModal.hidden = false;
    document.body.style.overflow = 'hidden';
}
function closeLogoutModal() {
    logoutModal.hidden = true;
    document.body.style.overflow = '';
}
if (logoutBtn) logoutBtn.addEventListener('click', openLogoutModal);
if (drawerLogout) drawerLogout.addEventListener('click', () => {
    closeDrawer();
    setTimeout(openLogoutModal, 220);
});
if (logoutCancel) logoutCancel.addEventListener('click', closeLogoutModal);
if (logoutConfirm) logoutConfirm.addEventListener('click', async () => {
    closeLogoutModal();
    try { await signOut(auth); } catch (err) { console.error(err); }
});
if (logoutBackdrop) logoutBackdrop.addEventListener('click', closeLogoutModal);

/* Session stay-signed-in */
const sessionStayBtn = document.getElementById('sessionStay');
if (sessionStayBtn) sessionStayBtn.addEventListener('click', () => {
    resetSessionTimers();
});

function openDrawer() {
    drawer.classList.add('is-open');
    drawerBackdrop.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}
function closeDrawer() {
    drawer.classList.remove('is-open');
    drawerBackdrop.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}
if (menuBtn) menuBtn.addEventListener('click', () => {
    drawer.classList.contains('is-open') ? closeDrawer() : openDrawer();
});
if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

drawerLinks.forEach((link) => {
    link.addEventListener('click', () => {
        drawerLinks.forEach((l) => l.classList.remove('is-active'));
        link.classList.add('is-active');
        closeDrawer();
    });
});
navLinks.forEach((link) => {
    link.addEventListener('click', () => {
        navLinks.forEach((l) => l.classList.remove('is-active'));
        link.classList.add('is-active');
    });
});

/* ============================================================
   FILTER BINDINGS
   ============================================================ */
if (periodSelect) periodSelect.addEventListener('change', () => {
    currentPeriod = periodSelect.value;
    const isCustom = currentPeriod === 'custom';
    if (customRangeGroup) customRangeGroup.hidden = !isCustom;
    if (customEndGroup) customEndGroup.hidden = !isCustom;
    if (isCustom && !customRangeStart) {
        /* Default: last 7 days */
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);
        if (customStartInput) customStartInput.value = start.toISOString().slice(0, 10);
        if (customEndInput) customEndInput.value = end.toISOString().slice(0, 10);
        customRangeStart = customStartInput.value;
        customRangeEnd = customEndInput.value;
    }
    renderAll();
});

/* Custom date inputs */
if (customStartInput) customStartInput.addEventListener('change', () => {
    customRangeStart = customStartInput.value;
    if (customRangeEnd && customRangeStart > customRangeEnd) {
        customRangeEnd = customRangeStart;
        if (customEndInput) customEndInput.value = customRangeEnd;
    }
    renderAll();
});
if (customEndInput) customEndInput.addEventListener('change', () => {
    customRangeEnd = customEndInput.value;
    if (customRangeStart && customRangeEnd < customRangeStart) {
        customRangeStart = customRangeEnd;
        if (customStartInput) customStartInput.value = customRangeStart;
    }
    renderAll();
});
if (compareSelect) compareSelect.addEventListener('change', () => {
    currentCompare = compareSelect.value;
    renderAll();
});
if (reelFilter) reelFilter.addEventListener('change', () => {
    currentReelFilter = reelFilter.value;
    renderAll();
});
if (snapshotBtn) snapshotBtn.addEventListener('click', saveSnapshot);
if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCSV);
if (exportPdfBtn) exportPdfBtn.addEventListener('click', async () => {
    const original = exportPdfBtn.innerHTML;
    exportPdfBtn.disabled = true;
    exportPdfBtn.innerHTML = '<span>Generating…</span>';
    try {
        await exportPDF();
    } catch (err) {
        console.error('PDF error:', err);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        exportPdfBtn.disabled = false;
        exportPdfBtn.innerHTML = original;
    }
});

/* ============================================================
   SETTINGS BINDINGS
   ============================================================ */
const saveSettingsBtn = $('saveSettingsBtn');
const resetSettingsBtn = $('resetSettingsBtn');
if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', async () => {
    try {
        await set(ref(db, 'auditSettings'), DEFAULT_SETTINGS);
        settings = { ...DEFAULT_SETTINGS };
        fillSettingsForm();
        renderAll();
        const note = $('settingsNote');
        if (note) note.textContent = 'Reset to defaults.';
    } catch (err) {
        console.error(err);
    }
});

/* ============================================================
   INIT
   ============================================================ */
fillSettingsForm();
renderAskGrid();
showLogin();
