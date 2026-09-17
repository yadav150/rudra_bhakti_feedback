/* ============================================================
   RUDRA BHAKTI — EXECUTIVE SECTION
   ============================================================ */
import { db } from './firebase.js';
import { ref, onValue } from "firebase/database";

const $ = (id) => document.getElementById(id);

let allFeedback = [];
let savedReels = [];
let unsubReels = null;
let unsubFeedback = null;
let started = false;

/* ============================================================
   INIT (called once from app.js after auth)
   ============================================================ */
export function init() {
    if (started) return;
    started = true;

    unsubReels = onValue(ref(db, 'reels'), (snap) => {
        savedReels = [];
        snap.forEach((child) => {
            savedReels.push({ id: child.key, ...child.val() });
        });
        render();
        window.markReady && window.markReady();
    }, (err) => {
        console.error('Reels listener error:', err);
        window.markReady && window.markReady();
    });

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

/* Called by app.js when this section becomes active */
export function render() {
    renderExecutive();
    renderActionCenter();
}

/* ============================================================
   HELPERS
   ============================================================ */
function pct(n, d) {
    if (!d) return 0;
    return Math.round((n / d) * 100);
}
function escapeHTML(v) {
    return String(v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ============================================================
   REEL STATS (used by action center)
   ============================================================ */
function computeReelStats(reelId) {
    const items = allFeedback.filter((f) => f.reelId === reelId);
    const total = items.length;
    if (!total) return null;

    const rated = items.filter((f) => f.rating != null);
    const avg = rated.length ? rated.reduce((s, f) => s + Number(f.rating || 0), 0) / rated.length : 0;

    const recYes = items.filter((f) => {
        const v = (f.more || f.wouldWatchMore || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;
    const recommend = pct(recYes, total);

    const repYes = items.filter((f) => {
        const v = (f.engageAgain || '').toLowerCase();
        return v.startsWith('very likely') || v.startsWith('likely');
    }).length;
    const repeat = pct(repYes, total);

    const feelings = {};
    items.forEach((f) => {
        const k = (f.feeling || '').trim();
        if (k) feelings[k] = (feelings[k] || 0) + 1;
    });
    const topFeeling = Object.entries(feelings).sort((a, b) => b[1] - a[1])[0];

    return { total, avg, recommend, repeat, topFeeling };
}

/* ============================================================
   EXECUTIVE
   ============================================================ */
function renderExecutive() {
    const total = allFeedback.length;
    const $ = (id) => document.getElementById(id);

    const execSatisfaction = $('execSatisfaction');
    const execSatisfactionSub = $('execSatisfactionSub');
    const execRecommend = $('execRecommend');
    const execRecommendSub = $('execRecommendSub');
    const execRepeat = $('execRepeat');
    const execRepeatSub = $('execRepeatSub');
    const execEmotion = $('execEmotion');
    const execEmotionSub = $('execEmotionSub');
    const execMomentum = $('execMomentum');
    const execMomentumSub = $('execMomentumSub');
    const execConfidence = $('execConfidence');
    const execConfidenceSub = $('execConfidenceSub');
    const execSummary = $('execSummary');

    if (!total) {
        if (execSatisfaction) execSatisfaction.textContent = '—';
        if (execSatisfactionSub) execSatisfactionSub.textContent = 'Not enough data';
        if (execRecommend) execRecommend.textContent = '—';
        if (execRecommendSub) execRecommendSub.textContent = 'Not enough data';
        if (execRepeat) execRepeat.textContent = '—';
        if (execRepeatSub) execRepeatSub.textContent = 'Not enough data';
        if (execEmotion) execEmotion.textContent = '—';
        if (execEmotionSub) execEmotionSub.textContent = 'Not enough data';
        if (execMomentum) execMomentum.textContent = '—';
        if (execMomentumSub) execMomentumSub.textContent = 'Not enough data';
        if (execConfidence) execConfidence.textContent = '0';
        if (execConfidenceSub) execConfidenceSub.textContent = 'No data';
        if (execSummary) execSummary.textContent = 'Not enough data to generate a reliable executive summary.';
        return;
    }

    const rated = allFeedback.filter((f) => f.rating != null);
    const avg = rated.length ? rated.reduce((s, f) => s + (Number(f.rating) || 0), 0) / rated.length : 0;
    const satisfaction = rated.length ? Math.round((avg / 5) * 100) : 0;

    const recYes = allFeedback.filter((f) => {
        const v = (f.more || f.wouldWatchMore || '').toLowerCase();
        return v.startsWith('definitely') || v.startsWith('yes');
    }).length;
    const recommend = pct(recYes, total);

    const repYes = allFeedback.filter((f) => {
        const v = (f.engageAgain || '').toLowerCase();
        return v.startsWith('very likely') || v.startsWith('likely');
    }).length;
    const repeat = pct(repYes, total);

    const feelings = {};
    allFeedback.forEach((f) => {
        const k = (f.feeling || '').trim();
        if (k) feelings[k] = (feelings[k] || 0) + 1;
    });
    const topFeeling = Object.entries(feelings).sort((a, b) => b[1] - a[1])[0];
    const emotionPct = topFeeling ? pct(topFeeling[1], total) : 0;

    const now = Date.now();
    const last7 = allFeedback.filter((f) => now - (new Date(f.submittedAt).getTime() || 0) <= 7 * 864e5);
    const prev7 = allFeedback.filter((f) => {
        const t = new Date(f.submittedAt).getTime() || 0;
        return now - t > 7 * 864e5 && now - t <= 14 * 864e5;
    });
    const recentAvg = last7.length ? last7.reduce((s, f) => s + Number(f.rating || 0), 0) / last7.length : 0;
    const prevAvg = prev7.length ? prev7.reduce((s, f) => s + Number(f.rating || 0), 0) / prev7.length : 0;
    const momentumDelta = prevAvg ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0;
    const momentumText = !prev7.length ? 'Baseline'
        : momentumDelta > 5 ? 'Improving'
        : momentumDelta < -5 ? 'Declining'
        : 'Stable';

    const confidence = total < 5 ? 'Low' : total < 20 ? 'Medium' : 'High';

    if (execSatisfaction) execSatisfaction.textContent = satisfaction + '%';
    if (execSatisfactionSub) execSatisfactionSub.textContent = 'Avg rating ' + avg.toFixed(1) + ' / 5';
    if (execRecommend) execRecommend.textContent = recommend + '%';
    if (execRecommendSub) execRecommendSub.textContent = recYes + ' of ' + total + ' want more';
    if (execRepeat) execRepeat.textContent = repeat + '%';
    if (execRepeatSub) execRepeatSub.textContent = repYes + ' likely to engage';
    if (execEmotion) execEmotion.textContent = topFeeling ? topFeeling[0] : '—';
    if (execEmotionSub) execEmotionSub.textContent = topFeeling ? emotionPct + '% of responses' : 'Not enough data';
    if (execMomentum) execMomentum.textContent = momentumText;
    if (execMomentumSub) execMomentumSub.textContent = prev7.length
        ? (momentumDelta >= 0 ? '+' : '') + momentumDelta.toFixed(1) + '% vs prior week'
        : 'Need 2 weeks of data';
    if (execConfidence) execConfidence.textContent = confidence;
    if (execConfidenceSub) execConfidenceSub.textContent = total + ' responses collected';

    const parts = [];
    parts.push('Audience satisfaction stands at ' + satisfaction + '% (avg ' + avg.toFixed(1) + '/5).');
    if (topFeeling) parts.push('The most common emotional response is ' + topFeeling[0].toLowerCase() + '.');
    parts.push(recommend + '% of respondents indicated interest in seeing more content like this.');
    if (prev7.length) {
        parts.push(momentumText === 'Improving' ? 'Recent ratings are trending upward.'
            : momentumText === 'Declining' ? 'Recent ratings are trending downward.'
            : 'Recent ratings are stable.');
    }
    if (total < 20) parts.push('Sample size is small — insights should be treated as directional.');
    if (execSummary) execSummary.textContent = parts.join(' ');
}

/* ============================================================
   ACTION CENTER
   ============================================================ */
function renderActionCenter() {
    const actionList = document.getElementById('actionList');
    if (!actionList) return;
    const total = allFeedback.length;
    const actions = [];

    if (total === 0) {
        actions.push({
            type: 'monitor',
            title: 'Collect initial responses',
            reason: 'No feedback has been received yet. Share your reel links to begin.',
            tags: []
        });
    } else {
        if (savedReels.length) {
            const best = savedReels.map((r) => ({ id: r.id, stats: computeReelStats(r.id) }))
                .filter((x) => x.stats && x.stats.total >= 3)
                .sort((a, b) => b.stats.avg - a.stats.avg)[0];
            if (best && best.stats.avg >= 4) {
                actions.push({
                    type: 'repeat',
                    title: 'Repeat winning pattern in ' + best.id,
                    reason: 'Averaged ' + best.stats.avg.toFixed(1) + '/5 across ' + best.stats.total + ' responses with ' + best.stats.recommend + '% recommendation.',
                    tags: [best.id, best.stats.recommend + '% recommend']
                });
            }

            const worst = savedReels.map((r) => ({ id: r.id, stats: computeReelStats(r.id) }))
                .filter((x) => x.stats && x.stats.total >= 3)
                .sort((a, b) => a.stats.avg - b.stats.avg)[0];
            if (worst && worst.stats.avg < 3.5) {
                actions.push({
                    type: 'improve',
                    title: 'Review content in ' + worst.id,
                    reason: 'Averaged ' + worst.stats.avg.toFixed(1) + '/5 with ' + worst.stats.total + ' responses.',
                    tags: [worst.id]
                });
            }
        }

        const highRatingLowRepeat = allFeedback.filter((f) => Number(f.rating) >= 4 && (f.engageAgain || '').toLowerCase().startsWith('unlikely')).length;
        if (highRatingLowRepeat >= 2) {
            actions.push({
                type: 'investigate',
                title: 'Investigate satisfaction-repeat gap',
                reason: highRatingLowRepeat + ' high-rated responses also indicated low repeat intent.',
                tags: ['Repeats: ' + highRatingLowRepeat]
            });
        }

        const wants = {};
        allFeedback.forEach((f) => { if (f.wantMore) wants[f.wantMore] = (wants[f.wantMore] || 0) + 1; });
        const topWant = Object.entries(wants).sort((a, b) => b[1] - a[1])[0];
        if (topWant && topWant[1] >= 3) {
            actions.push({
                type: 'experiment',
                title: 'Test new content: ' + topWant[0],
                reason: pct(topWant[1], total) + '% of audience requested this type.',
                tags: [topWant[0]]
            });
        }

        if (total < 20) {
            actions.push({
                type: 'monitor',
                title: 'Continue collecting responses',
                reason: 'Current sample size is ' + total + ' responses. Larger samples improve reliability.',
                tags: ['Sample: ' + total]
            });
        }
    }

    actionList.innerHTML = actions.map((a) => `
        <div class="action-item">
            <span class="action-badge action-badge--${a.type}">${escapeHTML(a.type)}</span>
            <div class="action-body">
                <span class="action-title">${escapeHTML(a.title)}</span>
                <span class="action-reason">${escapeHTML(a.reason)}</span>
                ${a.tags && a.tags.length ? `<div class="action-meta">${a.tags.map((t) => `<span class="action-tag">${escapeHTML(t)}</span>`).join('')}</div>` : ''}
            </div>
        </div>
    `).join('');
}
