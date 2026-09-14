/* ============================================================
   Serverless: Facebook Reel Metadata Resolver (no Meta App required)
   Fetches the public page HTML server-side and extracts OG tags.
   ============================================================ */

const CRAWLER_UAS = [
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)'
];

function isFacebookReelUrl(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        const ok = host === 'facebook.com'
            || host === 'www.facebook.com'
            || host === 'm.facebook.com'
            || host === 'mbasic.facebook.com'
            || host === 'fb.watch'
            || host.endsWith('.facebook.com');
        if (!ok) return false;
        return /\/reel\//i.test(u.pathname) || /\/videos\//i.test(u.pathname) || host === 'fb.watch';
    } catch { return false; }
}

function normalizeUrl(url) {
    try {
        const u = new URL(url);
        u.hash = '';
        return u.toString();
    } catch { return url; }
}

function pickMeta(html, prop) {
    const patterns = [
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, 'i')
    ];
    for (const p of patterns) {
        const m = html.match(p);
        if (m && m[1]) return decodeHtml(m[1].trim());
    }
    return '';
}

function pickTitle(html) {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m && m[1] ? decodeHtml(m[1].trim()) : '';
}

function decodeHtml(str) {
    return String(str)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method_not_allowed', message: 'POST only.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }

    const rawUrl = (body?.url || '').trim();
    if (!rawUrl) {
        return res.status(400).json({ error: 'invalid_url', message: 'Please enter a Facebook Reel URL.' });
    }
    if (!isFacebookReelUrl(rawUrl)) {
        return res.status(400).json({ error: 'invalid_url', message: 'This is not a valid Facebook Reel URL.' });
    }

    const target = normalizeUrl(rawUrl);

    let lastError = null;

    for (const ua of CRAWLER_UAS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000);

            const response = await fetch(target, {
                method: 'GET',
                redirect: 'follow',
                signal: controller.signal,
                headers: {
                    'User-Agent': ua,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache'
                }
            });

            clearTimeout(timeout);

            if (!response.ok) {
                lastError = `Facebook returned status ${response.status}.`;
                continue;
            }

            const html = await response.text();

            const ogTitle = pickMeta(html, 'og:title');
            const ogImage = pickMeta(html, 'og:image');
            const ogDesc = pickMeta(html, 'og:description');
            const ogUrl = pickMeta(html, 'og:url');
            const pageTitle = pickTitle(html);

            const title = ogTitle || pageTitle || '';
            const thumbnail = ogImage || '';
            const canonical = ogUrl || target;

            // Reject login-wall / generic responses
            const badTitles = /^(facebook|log in|login|watch)/i;
            if (!title && !thumbnail) {
                lastError = 'Facebook did not return usable metadata for this Reel.';
                continue;
            }
            if (badTitles.test(title) && !thumbnail) {
                lastError = 'Facebook served a login wall instead of Reel metadata.';
                continue;
            }

            return res.status(200).json({
                ok: true,
                title,
                thumbnail,
                description: ogDesc,
                url: canonical,
                provider: 'server_og_parse'
            });
        } catch (err) {
            if (err.name === 'AbortError') {
                lastError = 'Facebook did not respond in time.';
            } else {
                lastError = err.message || 'Network error.';
            }
        }
    }

    return res.status(502).json({
        error: 'meta_unavailable',
        message: lastError || 'Could not retrieve Reel metadata. Facebook may be blocking the request.'
    });
}
