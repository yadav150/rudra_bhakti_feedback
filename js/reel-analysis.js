/* ============================================================
   RUDRA BHAKTI — REEL ANALYSIS SECTION
   Defensive render + searchable picker (using existing .search)
   ============================================================ */
import { db } from './firebase.js';
import { ref, onValue } from "firebase/database";

const RECOMMENDATION_THRESHOLD = 10;

let allReels = [];
let allFeedback = [];
let activeReelId = null;
let unsubReels = null;
let unsubFeedback = null;
let started = false;

/* ============================================================
   INIT
   ============================================================ */
export function init() {
    if (started) return;
    started = true;

    bindSearchInput();

    unsubReels = onValue(ref(db, 'reels'), (snap) => {
        allReels = [];
        snap.forEach((child) => {
            allReels.push({ id: child.key, ...child.val() });
        });
        allReels.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
        populateDatalist();
        render();
        window.markReady && window.markReady();
    }, (err) => {
        console.error('Reels listener error:', err);
        window.markReady && window.markReady();
    });

    unsubFeedback = onValue(ref(db, 'feedback'), (snap) => {
        allFeedback = [];
        snap.forEach((child) => {
            allFeedback.push({ id: child.key, ...child.val() });
        });
        if (activeReelId) render();
        window.markReady && window.markReady();
    }, (err) => {
        console.error('Feedback listener error:', err);
        window.markReady && window.markReady();
    });
}

/* ============================================================
   RENDER — defensively pick a reel if none active
   ============================================================ */
export function render() {
    const analysisWrap = document.getElementById('analysisWrap');
    const noReelsState = document.getElementById('noReelsState');
    const input = document.getElementById('reelSearchInput');

    if (!allReels.length) {
        if (noReelsState) noReelsState.hidden = false;
        if (analysisWrap) analysisWrap.hidden = true;
        if (input) input.value = '';
        return;
    }
    if (noReelsState) noReelsState.hidden = true;

    /* ALWAYS ensure a valid activeReelId — this is the fix for "blank on first open" */
    if (!activeReelId || !allReels.find((r) => r.id === activeReelId)) {
        activeReelId = allReels[0].id;
    }

    const reel = allReels.find((r) => r.id === activeReelId);
    if (!reel) return;

    /* Keep the search input reflecting current selection (only if user isn't typing) */
    if (input && document.activeElement !== input) {
        input.value = reel.id + ' — ' + (reel.title || 'Untitled');
    }

    const stats = computeStats(reel, getReelItems(reel.id));
    renderHero(stats);
    renderKPIs(stats);
    renderBehavior(stats);
    renderTimeline(stats);
    renderHourChart(stats);
    renderWeekdayChart(stats);
    renderFeeling(stats);
    renderIntent(stats);
    renderWritten(stats);
    renderRecommendation(stats);

    if (analysisWrap) analysisWrap.hidden = false;
}

/* ============================================================
   SEARCH (uses native datalist — no new CSS)
   ============================================================ */
function bindSearchInput() {
    const input = document.getElementById('reelSearchInput');
    if (!input) return;

    input.addEventListener('change', () => {
        const val = input.value.trim();
        if (!val) { render(); return; }

        let reel = allReels.find((r) => r.id === val);

        if (!reel) {
            const id = val.split(' — ')[0].trim();
            reel = allReels.find((r) => r.id === id);
        }
        if (!reel) {
            const q = val.toLowerCase();
            reel = allReels.find((r) =>
                r.id.toLowerCase().includes(q) ||
                (r.title || '').toLowerCase().includes(q)
            );
        }
        if (reel) activeReelId = reel.id;
        render();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') input.blur();
    });
}

function populateDatalist() {
    const dl = document.getElementById('reelOptions');
    if (!dl) return;
    dl.innerHTML = allReels.map((r) => {
        const label = r.id + ' — ' + (r.title || 'Untitled');
        return `<option value="${escapeAttr(label)}"></option>`;
    }).join('');
}

function getReelItems(reelId) {
    return allFeedback.filter((f) => f.reelId === reelId);
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHTML(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(v) {
    return String(v == null ? '' : v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function pct(n, d) {
    if (!d) return 0;
    return Math.round((n / d) * 100);
}
function formatDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kolkata'
    }) + ' IST';
}
function formatRelative(ms) {
    if (!ms || ms < 0) return '—';
    const min = Math.floor(ms / 60000);
    if (min < 60) return min + ' min';
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return hrs + ' hr' + (hrs === 1 ? '' : 's');
    const days = Math.floor(hrs / 24);
    return days + ' day' + (days === 1 ? '' : 's');
}
function getISTHour(ts) {
    const s = new Date(ts).toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false
    });
    return parseInt(s, 10) % 24;
}
function getISTWeekday(ts) {
    return new Date(ts).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
}
function getISTDateKey(ts) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(ts));
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
}
function dateFromKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}
function formatHourBucket(idx) {
    const start = idx * 2, end = start + 2;
    return formatHourLabel(start) + ' – ' + formatHourLabel(end);
}
function formatHourLabel(h) {
    const hr = h % 24;
    const ampm = hr < 12 ? 'AM' : 'PM';
    const h12 = hr % 12 === 0 ? 12 : hr % 12;
    return h12 + ' ' + ampm;
}
function chartEmpty(title, text) {
    return `
        <div class="chart-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-5"/>
            </svg>
            <p>${escapeHTML(title)}</p>
            ${text ? `<span>${escapeHTML(text)}</span>` : ''}
        </div>
    `;
}

/* ============================================================
   STATS
   ============================================================ */
function computeStats(reel, items) {
    const total = items.length;
    if (!total) return { reel, items, total: 0 };

    const ratings = items.map((f) => Number(f.rating)).filter((r) => r >= 1 && r <= 5);
    const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    let variance = 0;
    if (ratings.length > 1) {
        variance = ratings.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / ratings.length;
    }
    const stdDev = Math.sqrt(variance);

    const recYes = items.filter((f) => {
        const v = (f.more || f.wouldWatchMore || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;

    const repYes = items.filter((f) => {
        const v = (f.engageAgain || '').toLowerCase();
        return v.startsWith('very likely') || v.startsWith('likely');
    }).length;

    const feelings = {};
    items.forEach((f) => {
        const k = (f.feeling || '').trim();
        if (k) feelings[k] = (feelings[k] || 0) + 1;
    });
    const feelingsSorted = Object.entries(feelings).sort((a, b) => b[1] - a[1]);

    const wants = {};
    items.forEach((f) => {
        const k = (f.wantMore || '').trim();
        if (k) wants[k] = (wants[k] || 0) + 1;
    });
    const wantsSorted = Object.entries(wants).sort((a, b) => b[1] - a[1]);

    const written = items.filter((f) => (f.message || '').trim());
    const avgMsgLen = written.length
        ? Math.round(written.reduce((s, f) => s + (f.message || '').trim().length, 0) / written.length)
        : 0;

    const tsList = items.map((f) => Number(f.submittedAt) || 0).filter((t) => t > 0);
    const firstTs = tsList.length ? Math.min(...tsList) : 0;
    const lastTs = tsList.length ? Math.max(...tsList) : 0;
    const reelCreatedAt = Number(reel.createdAt) || 0;
    const firstDelayMs = (firstTs && reelCreatedAt) ? Math.max(0, firstTs - reelCreatedAt) : 0;
    const spanMs = (lastTs && firstTs && lastTs > firstTs) ? (lastTs - firstTs) : 0;
    const spanDays = Math.max(1, Math.ceil(spanMs / 864e5));
    const velocity = total / spanDays;

    const hourBuckets = new Array(12).fill(0);
    const weekdayBuckets = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    tsList.forEach((ts) => {
        const bucket = Math.floor(getISTHour(ts) / 2);
        if (bucket >= 0 && bucket < 12) hourBuckets[bucket]++;
        const wd = getISTWeekday(ts);
        if (wd in weekdayBuckets) weekdayBuckets[wd]++;
    });
    const peakHourBucket = hourBuckets.indexOf(Math.max(...hourBuckets));
    const peakHourLabel = hourBuckets[peakHourBucket] > 0 ? formatHourBucket(peakHourBucket) : null;
    const peakWeekday = Object.entries(weekdayBuckets).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0)[0];

    const days = {};
    const timelineStart = reelCreatedAt || firstTs;
    if (timelineStart) {
        const startDate = dateFromKey(getISTDateKey(timelineStart));
        const endDate = dateFromKey(getISTDateKey(Date.now()));
        const cursor = new Date(startDate);
        let guard = 0;
        while (cursor <= endDate && guard < 400) {
            days[getISTDateKey(cursor.getTime())] = 0;
            cursor.setDate(cursor.getDate() + 1);
            guard++;
        }
    }
    tsList.forEach((ts) => {
        const k = getISTDateKey(ts);
        if (k in days) days[k]++;
    });

    const words = {};
    const stop = new Set(['the','a','an','and','or','but','is','are','was','were','to','of','in','on','for','with','at','by','from','this','that','it','i','you','we','they','he','she','very','so','too','my','your','our','their','as','if','then','than','be','been','has','have','had','not','no','do','does','did','can','could','would','should','will','just','only','also','well','like']);
    written.forEach((f) => {
        (f.message || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).forEach((w) => {
            if (w.length >= 3 && !stop.has(w)) words[w] = (words[w] || 0) + 1;
        });
    });
    const topWords = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 8);

    return {
        reel, items, total,
        avg: Math.round(avg * 10) / 10,
        stdDev: Math.round(stdDev * 100) / 100,
        recommendPct: pct(recYes, total),
        repeatPct: pct(repYes, total),
        feelings: feelingsSorted,
        topFeeling: feelingsSorted[0],
        wants: wantsSorted,
        topWant: wantsSorted[0],
        writtenCount: written.length,
        writtenPct: pct(written.length, total),
        avgMsgLen,
        firstTs, lastTs, firstDelayMs, spanDays, velocity,
        hourBuckets, weekdayBuckets,
        peakHourBucket, peakHourLabel, peakWeekday,
        days, topWords
    };
}

/* ============================================================
   RENDER SECTIONS
   ============================================================ */
function renderHero(stats) {
    const el = document.getElementById('reelHeroCard');
    if (!el) return;
    const r = stats.reel;
    const thumb = r.thumbnail
        ? `<img src="${escapeAttr(r.thumbnail)}" alt="" />`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v14l11-7z"/></svg>`;
    el.innerHTML = `
        <div class="panel-body">
            <div class="reel-row" style="border-bottom:0;padding:0;">
                <div class="reel-row-thumb">${thumb}</div>
                <div class="reel-row-main">
                    <div class="reel-row-top">
                        <span class="reel-row-id">${escapeHTML(r.id)}</span>
                        <span class="reel-row-title" style="white-space:normal;font-size:16px;">${escapeHTML(r.title || 'Untitled')}</span>
                    </div>
                    <div class="reel-row-url">
                        Added ${escapeHTML(formatDate(r.createdAt))} · ${stats.total} response${stats.total === 1 ? '' : 's'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function ratingLabel(avg) {
    if (avg >= 4.5) return 'Excellent reception';
    if (avg >= 4) return 'Strong reception';
    if (avg >= 3.5) return 'Stable reception';
    if (avg >= 3) return 'Mixed reception';
    return 'Below expectations';
}

function renderKPIs(stats) {
    const el = document.getElementById('kpiGrid');
    if (!el) return;
    if (!stats.total) {
        el.innerHTML = `<div style="grid-column:1/-1;">${chartEmpty('No responses yet', 'KPIs will appear once feedback arrives.')}</div>`;
        return;
    }
    const kpis = [
        { label: 'Responses', value: String(stats.total), sub: stats.total < 3 ? 'Sample too small' : stats.total < RECOMMENDATION_THRESHOLD ? 'Building sample' : 'Sufficient sample', icon: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>' },
        { label: 'Average Rating', value: stats.avg.toFixed(1) + ' / 5', sub: ratingLabel(stats.avg), icon: '<path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-1z"/>' },
        { label: 'Recommend Rate', value: stats.recommendPct + '%', sub: 'Want more like this', icon: '<path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>' },
        { label: 'Repeat Intent', value: stats.repeatPct + '%', sub: 'Likely to engage again', icon: '<path d="M21 12a9 9 0 11-6.219-8.56"/><path d="M22 4l-10 10"/>' }
    ];
    el.innerHTML = kpis.map((k) => `
        <div class="stat">
            <div class="stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${k.icon}</svg>
            </div>
            <div class="stat-body">
                <span class="stat-label">${escapeHTML(k.label)}</span>
                <span class="stat-value">${escapeHTML(k.value)}</span>
                <span class="exec-sub" style="margin-top:2px;">${escapeHTML(k.sub)}</span>
            </div>
        </div>
    `).join('');
}

function renderBehavior(stats) {
    const el = document.getElementById('behaviorGrid');
    if (!el) return;
    if (!stats.total) {
        el.innerHTML = `<div style="grid-column:1/-1;">${chartEmpty('No behavior data yet')}</div>`;
        return;
    }
    const cards = [
        { label: 'First Response Delay', value: stats.firstDelayMs ? formatRelative(stats.firstDelayMs) : '—', sub: 'From publish to first response', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' },
        { label: 'Response Velocity', value: stats.velocity.toFixed(1) + ' / day', sub: 'Average daily responses', icon: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>' },
        { label: 'Active Window', value: stats.spanDays + ' day' + (stats.spanDays === 1 ? '' : 's'), sub: 'First to last response', icon: '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>' },
        { label: 'Peak Time', value: stats.peakHourLabel || '—', sub: 'Highest activity (IST)', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' },
        { label: 'Peak Weekday', value: stats.peakWeekday ? stats.peakWeekday[0] : '—', sub: 'Most responses', icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
        { label: 'Written Rate', value: stats.writtenPct + '%', sub: 'With a message', icon: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>' }
    ];
    el.innerHTML = cards.map((c) => `
        <div class="exec-card">
            <div class="exec-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg>
            </div>
            <div class="exec-body">
                <span class="exec-label">${escapeHTML(c.label)}</span>
                <span class="exec-value">${escapeHTML(c.value)}</span>
                <span class="exec-sub">${escapeHTML(c.sub)}</span>
            </div>
        </div>
    `).join('');
}

function renderTimeline(stats) {
    const el = document.getElementById('timelineChart');
    const meta = document.getElementById('timelineMeta');
    if (!el) return;
    const keys = Object.keys(stats.days);
    if (!keys.length) {
        el.innerHTML = chartEmpty('No timeline data');
        if (meta) meta.textContent = '';
        return;
    }
    const values = keys.map((k) => ({ k, v: stats.days[k] }));
    const max = Math.max(...values.map((x) => x.v), 1);
    const peakVal = Math.max(...values.map((x) => x.v));
    const trimmed = values.length > 30 ? values.slice(values.length - 30) : values;
    if (meta) meta.textContent = keys.length + ' day' + (keys.length === 1 ? '' : 's');
    el.innerHTML = `<div class="dist-list">${trimmed.map(({ k, v }) => {
        const width = Math.round((v / max) * 100);
        const isPeak = v === peakVal && v > 0;
        return `
            <div class="dist-bar">
                <span class="dist-label" style="font-size:11px;">${escapeHTML(k.slice(5))}</span>
                <div class="dist-track"><div class="dist-fill" style="width:${width}%;${isPeak ? 'background:#2563eb;' : ''}"></div></div>
                <span class="dist-count">${v}</span>
            </div>
        `;
    }).join('')}</div>`;
}

function renderHourChart(stats) {
    const el = document.getElementById('hourChart');
    if (!el) return;
    if (!stats.total) { el.innerHTML = chartEmpty('No timing data'); return; }
    const max = Math.max(...stats.hourBuckets, 1);
    const peakIdx = stats.hourBuckets.indexOf(Math.max(...stats.hourBuckets));
    el.innerHTML = `<div class="dist-list">${stats.hourBuckets.map((v, i) => {
        const width = Math.round((v / max) * 100);
        const isPeak = i === peakIdx && v > 0;
        return `
            <div class="dist-bar">
                <span class="dist-label" style="font-size:10px;">${escapeHTML(formatHourLabel(i * 2))}</span>
                <div class="dist-track"><div class="dist-fill" style="width:${width}%;${isPeak ? 'background:#2563eb;' : ''}"></div></div>
                <span class="dist-count"${isPeak ? ' style="color:var(--text);font-weight:800;"' : ''}>${v}</span>
            </div>
        `;
    }).join('')}</div>`;
}

function renderWeekdayChart(stats) {
    const el = document.getElementById('weekdayChart');
    if (!el) return;
    if (!stats.total) { el.innerHTML = chartEmpty('No weekday data'); return; }
    const order = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const values = order.map((k) => ({ k, v: stats.weekdayBuckets[k] || 0 }));
    const max = Math.max(...values.map((x) => x.v), 1);
    const peakVal = Math.max(...values.map((x) => x.v));
    el.innerHTML = `<div class="dist-list">${values.map(({ k, v }) => {
        const width = Math.round((v / max) * 100);
        const isPeak = v === peakVal && v > 0;
        return `
            <div class="dist-bar">
                <span class="dist-label">${escapeHTML(k)}</span>
                <div class="dist-track"><div class="dist-fill" style="width:${width}%;${isPeak ? 'background:#2563eb;' : ''}"></div></div>
                <span class="dist-count"${isPeak ? ' style="color:var(--text);font-weight:800;"' : ''}>${v}</span>
            </div>
        `;
    }).join('')}</div>`;
}

function renderFeeling(stats) {
    const el = document.getElementById('feelingChart');
    if (!el) return;
    if (!stats.feelings.length) { el.innerHTML = chartEmpty('No feeling data yet'); return; }
    const total = stats.feelings.reduce((s, [, v]) => s + v, 0);
    const max = Math.max(...stats.feelings.map(([, v]) => v), 1);
    el.innerHTML = `<div class="dist-list">${stats.feelings.map(([k, v]) => {
        const width = Math.round((v / max) * 100);
        const isPeak = v === max;
        return `
            <div class="dist-bar">
                <span class="dist-label" style="font-size:11px;text-align:left;">${escapeHTML(truncate(k, 14))}</span>
                <div class="dist-track"><div class="dist-fill" style="width:${width}%;${isPeak ? 'background:#2563eb;' : ''}"></div></div>
                <span class="dist-count">${pct(v, total)}%</span>
            </div>
        `;
    }).join('')}</div>`;
}

function renderIntent(stats) {
    const el = document.getElementById('intentGrid');
    if (!el) return;
    if (!stats.total) {
        el.innerHTML = `<div style="grid-column:1/-1;">${chartEmpty('No intent data yet')}</div>`;
        return;
    }
    const cards = [];
    const moreYes = stats.items.filter((f) => {
        const v = (f.more || f.wouldWatchMore || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;
    const veryLikely = stats.items.filter((f) => (f.engageAgain || '').toLowerCase().startsWith('very likely')).length;
    const likely = stats.items.filter((f) => (f.engageAgain || '').toLowerCase().startsWith('likely')).length;

    cards.push({ label: 'Would Watch More', value: pct(moreYes, stats.total) + '%', sub: moreYes + ' of ' + stats.total + ' want similar content', tone: 'positive' });
    cards.push({ label: 'Repeat Intent', value: stats.repeatPct + '%', sub: veryLikely + ' very likely · ' + likely + ' likely', tone: stats.repeatPct >= 50 ? 'positive' : (stats.repeatPct >= 25 ? 'neutral' : 'negative') });

    if (stats.wants.length) {
        const [w, c] = stats.wants[0];
        cards.push({ label: 'Top Content Request', value: truncate(w, 24), sub: pct(c, stats.total) + '% requested this', tone: 'neutral' });
    }
    if (stats.topFeeling) {
        const [f, c] = stats.topFeeling;
        cards.push({ label: 'Dominant Feeling', value: truncate(f, 20), sub: pct(c, stats.total) + '% selected this', tone: 'positive' });
    }

    el.innerHTML = cards.map((c) => `
        <div class="perception-card">
            <div class="perception-icon perception-icon--${c.tone}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
            </div>
            <div class="perception-body">
                <span class="perception-label">${escapeHTML(c.label)}</span>
                <span class="perception-value" style="font-size:16px;">${escapeHTML(c.value)}</span>
                <span class="exec-sub" style="margin-top:2px;">${escapeHTML(c.sub)}</span>
            </div>
        </div>
    `).join('');
}

function avgLenDesc(len) {
    if (len === 0) return 'No written feedback yet.';
    if (len < 30) return 'Brief reactions.';
    if (len < 80) return 'Thoughtful responses.';
    return 'Deeply engaged audience.';
}

function renderWritten(stats) {
    const grid = document.getElementById('writtenGrid');
    const themes = document.getElementById('writtenThemes');
    if (!grid) return;
    if (!stats.total) {
        grid.innerHTML = `<div style="grid-column:1/-1;">${chartEmpty('No written feedback yet')}</div>`;
        if (themes) themes.innerHTML = '';
        return;
    }
    grid.innerHTML = `
        <div class="analytics-card">
            <div class="analytics-head"><span>Written Responses</span></div>
            <div class="analytics-body">
                <div class="metric-empty">
                    <span class="metric-value">${stats.writtenCount}</span>
                    <span class="metric-label">of ${stats.total} responses · ${stats.writtenPct}%</span>
                </div>
            </div>
        </div>
        <div class="analytics-card">
            <div class="analytics-head"><span>Avg Message Length</span></div>
            <div class="analytics-body">
                <div class="metric-empty">
                    <span class="metric-value">${stats.avgMsgLen}</span>
                    <span class="metric-label">${escapeHTML(avgLenDesc(stats.avgMsgLen))}</span>
                </div>
            </div>
        </div>
    `;
    if (!themes) return;
    if (!stats.topWords.length) {
        themes.innerHTML = chartEmpty('Not enough written feedback to detect themes');
        return;
    }
    themes.innerHTML = `<div class="ask-grid">${stats.topWords.map(([w, c]) => `
        <span class="action-tag" style="padding:6px 12px;font-size:12px;">
            ${escapeHTML(w)} · ${c}
        </span>
    `).join('')}</div>`;
}

/* ============================================================
   RECOMMENDATION
   ============================================================ */
function renderRecommendation(stats) {
    const el = document.getElementById('recommendationBlock');
    if (!el) return;
    if (stats.total < RECOMMENDATION_THRESHOLD) {
        el.innerHTML = lockedHTML(stats);
        return;
    }
    const verdict = computeVerdict(stats);
    const working = buildWorkingList(stats);
    const watch = buildWatchList(stats);
    const actions = buildActionList(stats);

    const verdictClsMap = { high: 'high', strong: 'strong', polarizing: 'insufficient', stable: 'stable', under: 'attention' };
    const borderMap = { high: '#1d7a3d', strong: '#2563eb', polarizing: '#7c6b00', under: '#b03030', stable: '#666' };

    el.innerHTML = `
        <div class="summary-card" style="border-left-color:${borderMap[verdict.cls] || '#666'};">
            <div class="summary-head">
                <span class="intel-label intel-label--${verdictClsMap[verdict.cls] || 'stable'}">${escapeHTML(verdict.label)}</span>
                <span>Final Recommendation</span>
            </div>
            <p class="summary-text">${escapeHTML(verdict.summary)}</p>
        </div>
        ${working.length ? `
            <div class="action-center" style="margin-top:14px;">
                <div class="action-head">
                    <h3>What Is Working</h3>
                    <p>Positive signals observed in this reel's data.</p>
                </div>
                <div class="alert-list">
                    ${working.map((t) => `<div class="alert-item alert-item--positive"><div class="alert-desc">${escapeHTML(t)}</div></div>`).join('')}
                </div>
            </div>
        ` : ''}
        ${watch.length ? `
            <div class="action-center" style="margin-top:14px;">
                <div class="action-head">
                    <h3>What Needs Attention</h3>
                    <p>Signals that warrant review or adjustment.</p>
                </div>
                <div class="alert-list">
                    ${watch.map((t) => `<div class="alert-item alert-item--warning"><div class="alert-desc">${escapeHTML(t)}</div></div>`).join('')}
                </div>
            </div>
        ` : ''}
        ${actions.length ? `
            <div class="action-center" style="margin-top:14px;">
                <div class="action-head">
                    <h3>Next Steps</h3>
                    <p>Actionable guidance for future content.</p>
                </div>
                <div class="action-list">
                    ${actions.map((t) => `
                        <div class="action-item">
                            <span class="action-badge action-badge--experiment">Action</span>
                            <div class="action-body">
                                <span class="action-reason" style="color:var(--text);font-size:13px;">${escapeHTML(t)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

function lockedHTML(stats) {
    const current = stats.total;
    const progress = Math.min(100, Math.round((current / RECOMMENDATION_THRESHOLD) * 100));
    const remaining = RECOMMENDATION_THRESHOLD - current;
    return `
        <div class="panel-card">
            <div class="panel-body panel-body--flush">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                    </div>
                    <h3>Final Recommendation Locked</h3>
                    <p>A reliable recommendation requires at least ${RECOMMENDATION_THRESHOLD} responses. ${remaining} more needed for this reel.</p>
                    <div style="width:100%;max-width:340px;margin:6px auto 0;display:grid;gap:8px;">
                        <div class="dist-track"><div class="dist-fill" style="width:${progress}%"></div></div>
                        <div style="font-size:12px;font-weight:700;color:var(--text);text-align:center;">${current} / ${RECOMMENDATION_THRESHOLD} responses</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function computeVerdict(stats) {
    const { avg, stdDev, repeatPct, total } = stats;
    const polarizing = stdDev >= 1.2 && avg >= 3.5;
    if (avg >= 4.5 && repeatPct >= 60) return { cls: 'high', label: 'Top Performer', summary: `Strong asset for Rudra Bhakti. High ratings and high repeat intent across ${total} responses.` };
    if (avg >= 4 && repeatPct >= 40) return { cls: 'strong', label: 'Strong Performer', summary: `Consistent positive reception across ${total} responses with healthy intent to return.` };
    if (polarizing) return { cls: 'polarizing', label: 'Polarizing', summary: `Mixed reaction. Average is ${avg.toFixed(1)}/5 but variance is high.` };
    if (avg >= 3.5) return { cls: 'stable', label: 'Stable', summary: `Solid baseline at ${avg.toFixed(1)}/5. Use as a reference, not a template.` };
    return { cls: 'under', label: 'Underperforming', summary: `Below target (${avg.toFixed(1)}/5). Review before scaling similar content.` };
}

function buildWorkingList(stats) {
    const list = [];
    const { avg, recommendPct, repeatPct, writtenPct, topFeeling, peakHourLabel, peakWeekday, total } = stats;
    if (avg >= 4.5) list.push(`Excellent satisfaction at ${avg.toFixed(1)}/5 across ${total} responses.`);
    else if (avg >= 4) list.push(`Strong rating of ${avg.toFixed(1)}/5.`);
    if (topFeeling) {
        const p = pct(topFeeling[1], total);
        if (p >= 30) list.push(`"${topFeeling[0]}" dominates (${p}%).`);
    }
    if (recommendPct >= 60) list.push(`${recommendPct}% want more content like this.`);
    if (repeatPct >= 60) list.push(`${repeatPct}% likely to engage again.`);
    if (writtenPct >= 40) list.push(`High written engagement (${writtenPct}%).`);
    if (peakHourLabel) list.push(`Peak window is ${peakHourLabel} IST${peakWeekday ? ' on ' + peakWeekday[0] : ''}.`);
    return list;
}

function buildWatchList(stats) {
    const list = [];
    const { avg, recommendPct, repeatPct, stdDev, total } = stats;
    if (avg >= 4 && repeatPct < 40) list.push(`High ratings but only ${repeatPct}% likely to return.`);
    if (avg < 3.5 && total >= 10) list.push(`Average rating ${avg.toFixed(1)}/5 is below 3.5.`);
    if (stdDev >= 1.2) list.push(`High variance (σ = ${stdDev.toFixed(2)}). Audience is split.`);
    if (recommendPct < 40 && avg >= 3.5) list.push(`Only ${recommendPct}% want more of this.`);
    if (!stats.topWant && total >= 10) list.push(`No clear content preference captured.`);
    return list;
}

function buildActionList(stats) {
    const list = [];
    const { avg, repeatPct, recommendPct, topWant, peakHourLabel, peakWeekday } = stats;
    if (avg >= 4.5 && repeatPct >= 60) list.push(`Replicate this format in the next 2–3 reels.`);
    if (peakHourLabel) list.push(`Publish near ${peakHourLabel} IST${peakWeekday ? ' (' + peakWeekday[0] + ')' : ''}.`);
    if (topWant && stats.wants.length) list.push(`Test a reel themed "${topWant[0]}" — ${pct(topWant[1], stats.total)}% requested it.`);
    if (avg >= 4 && repeatPct < 40) list.push(`Add stronger retention hooks to convert satisfaction into return visits.`);
    if (avg < 3.5) list.push(`Review written feedback before producing similar content.`);
    if (recommendPct >= 50 && !list.some((t) => t.startsWith('Test a reel themed'))) list.push(`Continue this direction with minor variations for 3 reels.`);
    if (!list.length) list.push(`Continue collecting responses.`);
    return list.slice(0, 4);
}
