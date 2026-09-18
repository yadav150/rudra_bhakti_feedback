/* ============================================================
   RUDRA BHAKTI — AUDIT: INTELLIGENCE CHATBOT
   Uses Groq API. Falls back to rule-based if key missing.
   ============================================================ */
import { db } from './firebase.js';
import { ref, get } from "firebase/database";
import {
    escapeHTML, emptyBlock
} from './audit-charts.js';

let groqKey = null;
let isStreaming = false;

export function init(state) {}

export function render(state) {
    window.__auditState = state;
    const el = document.getElementById('page-chatbot');
    if (!el) return;

    if (!el.dataset.built) {
        el.dataset.built = '1';
        el.innerHTML = `
            <div class="section-head">
                <h2>Intelligence Chatbot</h2>
                <p>Ask anything about your reels, feedback, and data. Powered by Groq.</p>
            </div>

            <div class="panel-card" style="margin-bottom:14px;">
                <div class="panel-body panel-body--flush">
                    <div id="chatMessages" style="max-height:520px;overflow-y:auto;padding:20px;display:grid;gap:14px;"></div>
                </div>
            </div>

            <div class="toolbar">
                <div class="search" style="flex:1;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    <input type="text" id="chatInput" placeholder="Ask about reels, feedback, trends…" autocomplete="off" />
                </div>
                <button type="button" class="btn btn-primary" id="chatSend">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    <span>Send</span>
                </button>
            </div>

            <div id="chatNotice" style="margin-top:14px;font-size:12px;color:var(--muted);"></div>
        `;

        document.getElementById('chatSend').addEventListener('click', sendMessage);
        const inp = document.getElementById('chatInput');
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        /* Welcome */
        appendBubble('bot', 'Hi! Ask me anything about your data. Examples:\n• Which reel is performing best?\n• Total responses?\n• Any integrity issues?\n• What changed this week?');
    }

    loadKey();
}

async function loadKey() {
    const notice = document.getElementById('chatNotice');
    try {
        const snap = await get(ref(db, 'adminSettings/groqKey'));
        if (snap.exists() && snap.val()) {
            groqKey = String(snap.val()).trim();
            if (notice) {
                notice.textContent = '✓ Groq API key loaded';
                notice.style.color = '#1d7a3d';
            }
        } else {
            groqKey = null;
            if (notice) {
                notice.textContent = '⚠ No Groq key saved. Go to Settings and add one. Bot will use rule-based fallback.';
                notice.style.color = '#7c6b00';
            }
        }
    } catch (err) {
        groqKey = null;
        if (notice) {
            notice.textContent = 'Could not read key: ' + err.message;
            notice.style.color = '#b03030';
        }
    }
}

async function sendMessage() {
    if (isStreaming) return;
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    appendBubble('user', text);

    const botBubble = appendBubble('bot', '');
    const typingIndicator = createTypingIndicator();
    botBubble.appendChild(typingIndicator);

    isStreaming = true;
    document.getElementById('chatSend').disabled = true;

    const startTime = Date.now();
    const MIN_TYPING_MS = 600;
    const s = window.__auditState || { reels: [], feedback: [], readIds: new Set(), auditLog: [] };

    try {
        if (!groqKey) {
            /* Rule-based fallback */
            await new Promise(r => setTimeout(r, MIN_TYPING_MS));
            const answer = ruleBasedAnswer(text, s);
            typingIndicator.remove();
            botBubble.textContent = answer;
            appendBasis(botBubble, `Rule-based · ${Date.now() - startTime}ms`);
            return;
        }

        /* Build context */
        const context = buildContext(text, s);

        /* Call Groq streaming */
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + groqKey
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages: [
                    { role: 'system', content: 'You are an audit analyst for Rudra Bhakti, a devotional content channel. Answer questions strictly based on the provided data. Use numbers, cite counts/IDs. If data is insufficient, say so clearly. Be concise (2-4 sentences). Do not invent facts. Use Indian English style.' },
                    { role: 'user', content: context + '\n\nQuestion: ' + text }
                ],
                stream: true,
                temperature: 0.2,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error('Groq ' + response.status + ': ' + errText.slice(0, 100));
        }

        /* Ensure typing indicator stays at least 600ms */
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_TYPING_MS) {
            await new Promise(r => setTimeout(r, MIN_TYPING_MS - elapsed));
        }
        typingIndicator.remove();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let firstToken = true;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const data = trimmed.slice(5).trim();
                if (data === '[DONE]') continue;
                try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content || '';
                    if (delta) {
                        if (firstToken) {
                            botBubble.textContent = '';
                            firstToken = false;
                        }
                        botBubble.textContent += delta;
                    }
                } catch (e) { /* skip malformed */ }
            }
        }

        if (firstToken) botBubble.textContent = '(No response)';
        appendBasis(botBubble, `Groq · ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    } catch (err) {
        console.error('Chat error:', err);
        typingIndicator.remove();
        botBubble.textContent = 'Error: ' + err.message + '\n\nFalling back to rule-based.';
        await new Promise(r => setTimeout(r, 400));
        const fallback = ruleBasedAnswer(text, s);
        botBubble.textContent = fallback;
        appendBasis(botBubble, 'Rule-based fallback');
    } finally {
        isStreaming = false;
        document.getElementById('chatSend').disabled = false;
        scrollChat();
    }
}

function appendBubble(role, text) {
    const container = document.getElementById('chatMessages');
    if (!container) return null;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--' + role;
    bubble.textContent = text;
    container.appendChild(bubble);
    scrollChat();
    return bubble;
}

function appendBasis(bubble, text) {
    if (!bubble) return;
    const basis = document.createElement('div');
    basis.style.cssText = 'margin-top:8px;font-size:11px;color:var(--muted);font-style:italic;border-top:1px solid var(--border);padding-top:6px;';
    basis.textContent = 'Based on: ' + text;
    bubble.appendChild(basis);
}

function scrollChat() {
    const c = document.getElementById('chatMessages');
    if (c) c.scrollTop = c.scrollHeight;
}

function createTypingIndicator() {
    const d = document.createElement('div');
    d.className = 'chat-typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    return d;
}

/* ============================================================
   CONTEXT BUILDER — smart pre-filter
   ============================================================ */
function buildContext(question, state) {
    const q = question.toLowerCase();
    const reels = state.reels || [];
    const feedback = state.feedback || [];

    const lines = [];

    /* Always include overall summary */
    lines.push('=== SYSTEM SNAPSHOT ===');
    lines.push('Total reels: ' + reels.length);
    lines.push('Total feedback: ' + feedback.length);

    const rated = feedback.filter(f => f.rating != null);
    const avg = rated.length ? (rated.reduce((s, f) => s + Number(f.rating), 0) / rated.length).toFixed(2) : '0';
    lines.push('Avg rating: ' + avg);

    /* Reel table */
    const reelStats = reels.map(r => {
        const items = feedback.filter(f => f.reelId === r.id);
        const rr = items.filter(f => f.rating != null);
        const rAvg = rr.length ? (rr.reduce((s, f) => s + Number(f.rating), 0) / rr.length).toFixed(2) : '—';
        const recYes = items.filter(f => {
            const v = (f.more || f.wouldWatchMore || '').toLowerCase();
            return v.startsWith('definitely') || v.startsWith('yes');
        }).length;
        return { id: r.id, title: (r.title || '').slice(0, 40), count: items.length, avg: rAvg, rec: items.length ? Math.round((recYes / items.length) * 100) : 0 };
    });

    lines.push('');
    lines.push('=== REELS ===');
    reelStats.forEach(r => {
        lines.push(`${r.id} | "${r.title}" | responses: ${r.count} | avg: ${r.avg} | recommend: ${r.rec}%`);
    });

    /* Specific reel focus */
    const reelIdMatch = question.match(/RB\d{3,}/i);
    if (reelIdMatch) {
        const rid = reelIdMatch[0].toUpperCase();
        const items = feedback.filter(f => f.reelId === rid);
        lines.push('');
        lines.push(`=== FOCUS: ${rid} ===`);
        lines.push(`Responses: ${items.length}`);
        if (items.length) {
            const feelings = {};
            const wants = {};
            items.forEach(f => {
                if (f.feeling) feelings[f.feeling] = (feelings[f.feeling] || 0) + 1;
                if (f.wantMore) wants[f.wantMore] = (wants[f.wantMore] || 0) + 1;
            });
            lines.push('Feeling breakdown: ' + JSON.stringify(feelings));
            lines.push('Wants breakdown: ' + JSON.stringify(wants));
            const msgs = items.filter(f => (f.message || '').trim()).slice(0, 5);
            if (msgs.length) {
                lines.push('Recent messages:');
                msgs.forEach(f => lines.push('  • ' + f.message.slice(0, 100)));
            }
        }
    }

    /* Feeling / option aggregates */
    if (q.includes('feeling') || q.includes('emotion')) {
        const c = {};
        feedback.forEach(f => { if (f.feeling) c[f.feeling] = (c[f.feeling] || 0) + 1; });
        lines.push('');
        lines.push('=== FEELINGS ===');
        lines.push(JSON.stringify(c));
    }

    if (q.includes('want') || q.includes('content') || q.includes('type')) {
        const c = {};
        feedback.forEach(f => { if (f.wantMore) c[f.wantMore] = (c[f.wantMore] || 0) + 1; });
        lines.push('');
        lines.push('=== WANTS ===');
        lines.push(JSON.stringify(c));
    }

    /* Recent activity */
    const recent = [...feedback].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0)).slice(0, 5);
    lines.push('');
    lines.push('=== 5 MOST RECENT RESPONSES ===');
    recent.forEach(f => lines.push(`${f.reelId} | rating: ${f.rating} | feeling: ${f.feeling || '—'} | ${f.submittedAt ? new Date(f.submittedAt).toLocaleString('en-IN') : '—'}`));

    return lines.join('\n');
}

/* ============================================================
   RULE-BASED FALLBACK
   ============================================================ */
function ruleBasedAnswer(question, state) {
    const q = question.toLowerCase();
    const reels = state.reels || [];
    const feedback = state.feedback || [];

    /* Best reel */
    if (q.includes('best') || q.includes('top') || q.includes('highest')) {
        if (!feedback.length) return 'No feedback data yet.';
        const stats = reels.map(r => {
            const items = feedback.filter(f => f.reelId === r.id && f.rating != null);
            const avg = items.length ? items.reduce((s, f) => s + Number(f.rating), 0) / items.length : 0;
            return { id: r.id, avg, count: items.length };
        }).filter(x => x.count >= 1).sort((a, b) => b.avg - a.avg);
        if (!stats.length) return 'No rated reels yet.';
        const t = stats[0];
        return `Your best reel is ${t.id} with an average rating of ${t.avg.toFixed(2)}/5 across ${t.count} responses.`;
    }

    /* Worst reel */
    if (q.includes('worst') || q.includes('lowest') || q.includes('weak')) {
        if (!feedback.length) return 'No feedback data yet.';
        const stats = reels.map(r => {
            const items = feedback.filter(f => f.reelId === r.id && f.rating != null);
            const avg = items.length ? items.reduce((s, f) => s + Number(f.rating), 0) / items.length : 0;
            return { id: r.id, avg, count: items.length };
        }).filter(x => x.count >= 1).sort((a, b) => a.avg - b.avg);
        if (!stats.length) return 'No rated reels yet.';
        const t = stats[0];
        return `Lowest performing reel is ${t.id} with avg ${t.avg.toFixed(2)}/5 across ${t.count} responses.`;
    }

    /* Total */
    if (q.includes('total') || q.includes('how many')) {
        return `You have ${reels.length} reels and ${feedback.length} feedback responses.`;
    }

    /* Feeling */
    if (q.includes('feeling') || q.includes('emotion')) {
        const c = {};
        feedback.forEach(f => { if (f.feeling) c[f.feeling] = (c[f.feeling] || 0) + 1; });
        const sorted = Object.entries(c).sort((a, b) => b[1] - a[1]);
        if (!sorted.length) return 'No feelings recorded yet.';
        return `Most common feeling: "${sorted[0][0]}" (${sorted[0][1]} of ${feedback.length}).`;
    }

    /* Wants */
    if (q.includes('want') || q.includes('content type')) {
        const c = {};
        feedback.forEach(f => { if (f.wantMore) c[f.wantMore] = (c[f.wantMore] || 0) + 1; });
        const sorted = Object.entries(c).sort((a, b) => b[1] - a[1]);
        if (!sorted.length) return 'No content preferences recorded yet.';
        return `Top requested content: "${sorted[0][0]}" (${sorted[0][1]} requests).`;
    }

    /* Recent */
    if (q.includes('recent') || q.includes('latest')) {
        const recent = [...feedback].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0)).slice(0, 3);
        if (!recent.length) return 'No recent activity.';
        return 'Recent: ' + recent.map(f => `${f.reelId} (${f.rating}/5)`).join(', ');
    }

    /* Default */
    return `I have ${reels.length} reels and ${feedback.length} feedback records. Try: "best reel", "total responses", "recent activity", "feelings", or "wanted content".`;
}
