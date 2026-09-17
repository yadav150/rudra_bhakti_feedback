/* ============================================================
   RUDRA BHAKTI — AUDIT: QUESTION INTELLIGENCE
   Exact fields from index.html form (6 questions).
   ============================================================ */
import {
    createBarChart,
    pct, escapeHTML, emptyBlock, COLORS
} from './audit-charts.js';

/* Exact questions from index.html — nothing else */
const QUESTIONS = [
    { key: 'feeling',     label: 'How did this Reel make you feel?',                 type: 'options' },
    { key: 'more',        label: 'Would you like to see more Reels like this?',      type: 'options' },
    { key: 'rating',      label: 'How would you rate this Reel?',                    type: 'rating' },
    { key: 'wantMore',    label: 'What type of Reels would you like to see more of?',type: 'options' },
    { key: 'engageAgain', label: 'How likely to engage with similar Reels again?',   type: 'options' },
    { key: 'message',     label: 'Tell us what you felt (written)',                  type: 'textarea' }
];

export function init(state) {}

export function render(state) {
    const el = document.getElementById('page-questions');
    if (!el) return;

    const feedback = (state && state.feedback) || [];

    if (!feedback.length) {
        el.innerHTML = `
            <div class="section-head"><h2>Question Intelligence</h2><p>No responses yet.</p></div>
            <div class="panel-card"><div class="panel-body">${emptyBlock('Waiting for feedback data')}</div></div>
        `;
        return;
    }

    /* Per-question stats */
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

    const visible = stats.filter(s => s.answered > 0);

    el.innerHTML = `
        <div class="section-head">
            <h2>Question Intelligence</h2>
            <p>Per-question response counts and option distribution — actual form fields only.</p>
        </div>

        <div class="stats" style="margin-bottom:18px;">
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Total Questions</span>
                    <span class="stat-value">${QUESTIONS.length}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Total Responses</span>
                    <span class="stat-value">${feedback.length}</span>
                </div>
            </div>
            <div class="stat">
                <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div class="stat-body">
                    <span class="stat-label">Questions Answered</span>
                    <span class="stat-value">${visible.length} / ${QUESTIONS.length}</span>
                </div>
            </div>
        </div>

        <div class="panel-card" style="margin-bottom:14px;">
            <div class="panel-head"><span class="panel-title">Response Count per Question</span></div>
            <div class="panel-body"><div class="chart-wrap"><canvas id="qChart"></canvas></div></div>
        </div>

        ${stats.map(q => `
            <div class="panel-card" style="margin-top:14px;">
                <div class="panel-head">
                    <span class="panel-title">${escapeHTML(q.label)}</span>
                    <span class="panel-meta">${q.answered} answered${q.skipped ? ' · ' + q.skipped + ' skipped' : ''}</span>
                </div>
                <div class="panel-body">
                    ${q.sorted.length ? `
                        <div class="dist-list">
                            ${q.sorted.map(([k, v]) => `
                                <div class="dist-bar">
                                    <span class="dist-label" style="font-size:11px;text-align:left;min-width:100px;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(k)}</span>
                                    <div class="dist-track"><div class="dist-fill" style="width:${pct(v, q.answered)}%"></div></div>
                                    <span class="dist-count">${v} (${pct(v, q.answered)}%)</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : emptyBlock('No answers for this question')}
                </div>
            </div>
        `).join('')}
    `;

    if (visible.length) {
        createBarChart('qChart',
            visible.map(q => q.key),
            [{
                label: 'Answered',
                data: visible.map(q => q.answered),
                backgroundColor: COLORS.primary,
                borderRadius: 6
            }],
            { legend: false }
        );
    }
}
