const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const publicKeys = new Set(require('../config/portfolio-public-media.json'));

module.exports = async function portfolioMedia(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  const key = String(req.query?.key || '');
  // Only the owner-selected public photo catalog is accessible through the public website.
  if (!publicKeys.has(key)) return res.status(404).end();
  const token = process.env.FIELDCAM_MEDIA_READ_TOKEN;
  if (!token) return res.status(503).end();
  try {
    const upstream = await fetch(`https://valiant-fieldcam-cloud.vercel.app/api/media?key=${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(55000)
    });
    if (!upstream.ok || !upstream.body) return res.status(upstream.status === 404 ? 404 : 502).end();
    const type = upstream.headers.get('content-type') || '';
    if (!/^image\/(jpeg|png|webp|heic)$/.test(type.split(';')[0])) return res.status(502).end();
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') { await upstream.body.cancel(); return res.status(200).end(); }
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch {
    if (!res.headersSent) return res.status(502).end();
    res.destroy();
  }
};
