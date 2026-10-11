# BabyLoveGrowth blog publishing

Production endpoint: https://www.valiantdoor.com/api/blog-webhook
Article URLs: https://www.valiantdoor.com/blog/<slug>

In BabyLoveGrowth Settings → Publishing → Webhook, configure the endpoint and copy the value of BABYLOVEGROWTH_WEBHOOK_SECRET from this website's Vercel environment settings into the Bearer token field. Blog path is /blog. Send the first article, then enable Automatically Publish.

The secret is only stored in Vercel environment variables. Do not put it into frontend code, GitHub, logs, or documentation. Authorization: Bearer and X-API-Key are accepted. Authorization takes precedence if both are supplied.

The handler validates and sanitizes HTML, rejects slugs belonging to existing static guides, and stores each article by hashed provider ID in the website's existing private Vercel Blob store under valiant-blog/articles/. Retries update the same article. Republishing must keep its original slug, preserving existing links. Article slugs cannot collide across provider IDs. Use a new slug for a newly imported article that conflicts with a manually written guide.

The blog index and blog sitemap are served by api/blog.js. Their original static templates are in lib/blog-index.html and lib/blog-sitemap.xml. Existing static article pages continue to be served as before. New article content is rendered on the server, with canonical URLs, article schema, mobile styles, and the existing website header/footer. The sitemap index already references /sitemap-blog.xml.

POST an authenticated {"type":"connection_check"} to verify storage access without publishing a sample article. Success returns {"success":true,"storageReady":true}. Real publishing returns {"success":true,"link":"https://www.valiantdoor.com/blog/<slug>"}. Storage failures return 503 so BabyLoveGrowth can retry.

Run verification: node tests/test-blog-publishing.cjs. It mocks Blob and does not write public content or need credentials.

The website side is deployed independently of the provider connection. If the provider account is not signed in, the connection must still be saved in BabyLoveGrowth before automatic publishing starts.
