const FB_GRAPH_VERSION = 'v18.0';

function isFacebookReelUrl(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        const ok = host === 'facebook.com' || host === 'www.facebook.com'
            || host === 'm.facebook.com' || host === 'fb.watch'
            || host.endsWith('.facebook.com');
        if (!ok) return false;
        return /\/reel\//i.test(u.pathname) || host === 'fb.watch';
    } catch { return false; }
}
function normalizeUrl(url) {
    try { const u = new URL(url); u.hash = ''; u.search = ''; return u.toString(); }
    catch { return url; }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'method_not_allowed' }) };

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}

    const rawUrl = (body.url || '').trim();
    if (!rawUrl) return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing_url', message: 'Please enter a Facebook Reel URL.' }) };
    if (!isFacebookReelUrl(rawUrl)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid_url', message: 'This is not a valid Facebook Reel URL.' }) };

    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) return { statusCode: 500, headers, body: JSON.stringify({ error: 'server_config', message: 'Server is not configured with a Facebook access token.' }) };

    const cleanUrl = normalizeUrl(rawUrl);
    const endpoints = [
        `https://graph.facebook.com/${FB_GRAPH_VERSION}/oembed_post`,
        `https://graph.facebook.com/${FB_GRAPH_VERSION}/oembed_video`
    ];
    let lastError = null;

    for (const endpoint of endpoints) {
        try {
            const apiUrl = `${endpoint}?url=${encodeURIComponent(cleanUrl)}&access_token=${encodeURIComponent(token)}`;
            const r = await fetch(apiUrl);
            const data = await r.json().catch(() => ({}));
            if (data.error) { lastError = data.error.message; continue; }
            const title = (data.title || data.author_name || '').trim();
            const thumbnail = (data.thumbnail_url || data.image || '').trim();
            const canonical = (data.url || data.provider_url || cleanUrl).trim();
            if (!title && !thumbnail) { lastError = 'Meta returned no usable metadata.'; continue; }
            return { statusCode: 200, headers, body: JSON.stringify({ ok: true, title, thumbnail, url: canonical, author: data.author_name || '', provider: 'facebook_graph_oembed' }) };
        } catch (err) {
            lastError = err.message || 'Network error.';
        }
    }

    return { statusCode: 502, headers, body: JSON.stringify({ error: 'meta_unavailable', message: lastError || 'Metadata not available via Meta API.' }) };
};
