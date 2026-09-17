/* ============================================================
   RUDRA BHAKTI — AUDIT: QUESTION INTELLIGENCE
   Per-question response counts + option distribution.
   ============================================================ */
import {
    createBarChart,
    pct, escapeHTML, emptyBlock, COLORS
} from './audit-charts.js';

/* Question schema — both new + legacy fields */
const QUESTIONS = [
    { key: 'feeling',      label: 'How did this Reel make you feel?' },
    { key: 'more',         label: 'Would you like to see more Reels like this?' },
    { key: 'rating',       label: 'How would you rate this Reel? (1-5)' },
    { key: 'wantMore',     label: 'What type of Reels would you like more of?' },
    { key: 'engageAgain',  label: 'How likely to engage with similar Reels again?' },
    { key: 'message',      label: 'Tell us what you felt (written)' },
    /* Legacy fields (may exist in older records) */
    { key: 'stoodOut',     label: 'What stood out most? (legacy)' },
    { key: 'connectedWith',label: 'What did you connect with most? (legacy)' },
    { key: 'heldInterest', label: 'Did it hold your interest? (legacy)' },
    { key: 'presentation', label: 'Overall presentation rating? (legacy)' },
    { key: 'improve',      label: 'What would you improve? (legacy)' },
    { key: 'likedPart',    label: 'Which part did you like most? (legacy)' }
];

export function init(state) {}

export function render(state) {
    const el = document.getElementById('page-questions');
    if (!el) return;

    const feedback = state.feedback || [];

    if (!feedback.length) {
        el.innerHTML = `
            <div class="section-head"><h2>Question Intelligence</h2><p>No responses yet.</p></div>
            <div class="panel-card"><div class="panel-body">${emptyBlock('Waiting for feedback data')}</div></div>
        `;
        return;
    }

    /* Compute per-question stats */
    const stats = QUESTIONS.map(q => {
        let answered = 0;
        const distribution = {};
        feedback.forEach(f => {
            let v = f[q.key];
            if (v == null) return;
            v = String(v).trim();
            if (!v) return;
            answered++;
            distribution[v] = (distribution[v] || 0) + 1;
        });
        const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
        return { ...q, answered, sorted, skipped: feedback.length - answered };
    });

    /* Only show questions that have any answers */
    const visible = stats.filter(s => s.answered > 0);

    /* Overall completion */
    const totalAnswered = visible.reduce((s, q) => s + q.answered, 0);
    const totalPossible = visible.length * feedback.length;
    const overallCompletion = pct(totalAnswered, totalPossible);

    el.innerHTML = `
        <div class="section-head">
            <h2>Question Intelligence</h2>
            <p>Per-question response counts and option distribution.</p>
        </div>

        <div class="stats" style="margin-bottom:18px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Active Questions</span>
                    <span class="stat-value">${visible.length}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Total Responses</span>
                    <span class="stat-value">${feedback.length}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Avg Completion</span>
                    <span class="stat-value">${overallCompletion}%</span>
                </div>
            </div>
        </div>

        <div class="panel-card" style="margin-bottom:14px;">
            <div class="panel-head"><span class="panel-title">Response Count per Question</span></div>
            <div class="panel-body"><div class="chart-wrap"><canvas id="qChart"></canvas></div></div>
        </div>

        ${visible.map(q => `
            <div class="panel-card" style="margin-top:14px;">
                <div class="panel-head">
                    <span class="panel-title">${escapeHTML(q.label)}</span>
                    <span class="panel-meta">${q.answered} answered · ${q.skipped} skipped</span>
                </div>
                <div class="panel-body">
                    <div class="dist-list">
                        ${q.sorted.slice(0, 10).map(([k, v]) => `
                            <div class="dist-bar">
                                <span class="dist-label" style="font-size:11px;text-align:left;min-width:80px;">${escapeHTML(k.slice(0, 14))}</span>
                                <div class="dist-track"><div class="dist-fill" style="width:${pct(v, q.answered)}%"></div></div>
                                <span class="dist-count">${v} (${pct(v, q.answered)}%)</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('')}
    `;

    /* Chart — response count per question */
    if (visible.length) {
        createBarChart('qChart',
            visible.map(q => q.key),
            [{
                label: 'Answered',
                data: visible.map(q => q.answered),
                backgroundColor: COLORS.primary,
                borderRadius: 6
            }],
            { legend: false, horizontal: visible.length > 6 }
        );
    }
}
