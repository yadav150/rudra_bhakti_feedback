/* ============================================================
   Serverless: Facebook Reel Metadata Proxy
   Uses Meta Graph API oEmbed endpoint (server-side only)
   ============================================================ */

const FB_GRAPH_VERSION = 'v18.0';

function isFacebookReelUrl(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        const ok = host === 'facebook.com'
            || host === 'www.facebook.com'
            || host === 'm.facebook.com'
            || host === 'fb.watch'
            || host.endsWith('.facebook.com');
        if (!ok) return false;
        return /\/reel\//i.test(u.pathname) || host === 'fb.watch';
    } catch {
        return false;
    }
}

function normalizeUrl(url) {
    try {
        const u = new URL(url);
        u.hash = '';
        u.search = '';
        return u.toString();
    } catch {
        return url;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }

    const rawUrl = (body?.url || '').trim();

    if (!rawUrl) {
        return res.status(400).json({
            error: 'missing_url',
            message: 'Please enter a Facebook Reel URL.'
        });
    }
    if (!isFacebookReelUrl(rawUrl)) {
        return res.status(400).json({
            error: 'invalid_url',
            message: 'This is not a valid Facebook Reel URL.'
        });
    }

    const token = process.env.FB_ACCESS_TOKEN;
    if (!token) {
        return res.status(500).json({
            error: 'server_config',
            message: 'Server is not configured with a Facebook access token. Contact the administrator.'
        });
    }

    const cleanUrl = normalizeUrl(rawUrl);

    // Try oEmbed post first, then oEmbed video
    const endpoints = [
        `https://graph.facebook.com/${FB_GRAPH_VERSION}/oembed_post`,
        `https://graph.facebook.com/${FB_GRAPH_VERSION}/oembed_video`
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
        try {
            const apiUrl = `${endpoint}?url=${encodeURIComponent(cleanUrl)}&access_token=${encodeURIComponent(token)}`;
            const r = await fetch(apiUrl, { method: 'GET' });
            const data = await r.json().catch(() => ({}));

            if (data.error) {
                lastError = data.error.message || 'Meta API error';
                continue;
            }

            const title = (data.title || data.author_name || '').trim();
            const thumbnail = (data.thumbnail_url || data.image || '').trim();
            const canonical = (data.url || data.provider_url || cleanUrl).trim();

            if (!title && !thumbnail) {
                lastError = 'Meta returned no usable metadata for this Reel.';
                continue;
            }

            return res.status(200).json({
                ok: true,
                title,
                thumbnail,
                url: canonical,
                author: data.author_name || '',
                provider: 'facebook_graph_oembed'
            });
        } catch (err) {
            lastError = err.message || 'Network error contacting Meta.';
        }
    }

    return res.status(502).json({
        error: 'meta_unavailable',
        message: lastError || 'Metadata is not available for this Reel via the Meta API.'
    });
}
