# BabyLoveGrowth blog publishing and API sync

Webhook endpoint: https://www.valiantdoor.com/api/blog-webhook
API sync endpoint: https://www.valiantdoor.com/api/blog-sync
English article URLs: https://www.valiantdoor.com/blog/<slug>
Other language URLs: https://www.valiantdoor.com/blog/<language>/<slug>

## Configuration

Set BABYLOVEGROWTH_API_KEY in the main website Vercel project (valiantdoor-com-current) for Production. This is the API key generated in BabyLoveGrowth Settings → Publishing → API, separate from the webhook bearer token. Never place it in frontend code, source control, logs, or documentation. Vercel's server environment already contains the Blob storage token. CRON_SECRET authenticates scheduled GET requests.

For real-time publishing, set the webhook URL in BabyLoveGrowth Settings → Publishing → Webhook and enter the value of BABYLOVEGROWTH_WEBHOOK_SECRET as the Bearer token. The blog path is /blog. Webhooks accept Authorization: Bearer and the X-API-Key fallback; Authorization takes precedence. Enable Automatically Publish after the first article succeeds.

## API synchronization

Vercel Cron calls /api/blog-sync hourly at minute 0. All requests to https://api.babylovegrowth.ai/api/integrations use X-API-Key from BABYLOVEGROWTH_API_KEY, Content-Type: application/json, and an application-specific User-Agent. The sync reads summary pages with limit=50 and offset, fetches each full article by id, and stops when a page has fewer than 50 entries. It does not filter by the provider's published flag.

Requests run sequentially at least 2.1 seconds apart. HTTP 429 and server failures trigger bounded backoff, respecting Retry-After. Large imports checkpoint the next offset in private Blob storage and continue next hour. A completed scan resets the next scan to offset 0 so newly generated and updated articles are discovered. The standalone scripts/sync-babylovegrowth.mjs uses the same sync implementation for a manual server-only import with the required environment variables. The previous GitHub scheduled static-file writer is removed because Vercel Cron now owns synchronization.

Manual authenticated POST to /api/blog-sync uses the webhook bearer token and returns counts, completion state, next offset and skipped validation failures. Missing API credentials return 503 with a configuration message. Failed API authentication returns 502 with the upstream HTTP status. The website serves articles from its own private storage, with no BabyLoveGrowth API request during a page view.

## Field mapping and storage

- title: visible title and SEO title
- content_html: sanitized HTML body
- content_markdown: retained as a Markdown alternative
- slug: idempotency key within each language
- meta_description / metaDescription: SEO description
- hero_image_url / heroImageUrl: featured image
- jsonLd and faqJsonLd: JSON-LD scripts in the document head, escaped against script-tag injection
- languageCode: language metadata and separate language URLs
- publishedAt (or createdAt / created_at fallback): publication date
- published_url: the site's canonical URL is stored locally and returned as link in webhook responses; the provider discovers it there or from the sitemap

Articles are stored under valiant-blog/articles/ using a hash of language and slug. Repeated deliveries update the same article even when the provider ID changes. Unchanged content avoids a new write or modified date. Earlier ID-keyed records migrate on the next upsert, after the new write succeeds. Existing manually authored static guides are protected from overwrite; their slug collisions are reported as validation failures. HTML strips executable scripts and unsafe attributes; structured JSON-LD is retained separately.

The blog index, individual imported pages and blog sitemap are server-rendered by api/blog.js. Original static index/sitemap templates are in lib/blog-index.html and lib/blog-sitemap.xml. Existing manually authored article pages continue to be served as before.

## Verification

Run npm test, or run node tests/test-blog-publishing.cjs and node tests/test-blog-sync.cjs directly. Tests mock Blob and API responses, require no credentials and do not publish content. They cover mapping, safe schema output, slug upserts, migration, multilingual routing, pagination, rate limits, retries, full content fetches and checkpoint recovery.

The webhook connection check is an authenticated POST {"type":"connection_check"}. Real publishing returns {"success":true,"link":"https://www.valiantdoor.com/blog/<slug>"}. API synchronization cannot be verified against the provider until BABYLOVEGROWTH_API_KEY is configured.
