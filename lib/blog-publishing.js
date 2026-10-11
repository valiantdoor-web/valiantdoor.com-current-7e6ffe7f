const { createHash, timingSafeEqual } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const blob = require('@vercel/blob');
const SITE = 'https://www.valiantdoor.com';
const PREFIX = 'valiant-blog/articles/';
const languageKey = article => String(article.language || 'en').split('-')[0].toLowerCase();
const articlePath = article => '/blog/' + (languageKey(article) === 'en' ? '' : languageKey(article) + '/') + article.slug;
const articleUrl = article => SITE + articlePath(article);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const readTemplate = () => fs.readFileSync(path.join(__dirname, 'blog-index.html'), 'utf8');
const staticSlugs = new Set(require('./blog-static-slugs.json'));
function authorized(req) {
  const secret = process.env.BABYLOVEGROWTH_WEBHOOK_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization;
  const token = auth ? (/^Bearer (.+)$/.exec(auth)?.[1] || '') : (req.headers['x-api-key'] || '');
  return timingSafeEqual(createHash('sha256').update(String(token)).digest(), createHash('sha256').update(secret).digest());
}
function safeUrl(value, image = false) {
  if (!value) return '';
  try {
    const url = new URL(String(value), SITE);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    if (image && url.protocol !== 'https:') return '';
    return url.href;
  } catch { return ''; }
}
function sanitize(html) {
  const $ = cheerio.load(html, null, false);
  $('script,style,iframe,object,embed,form,input,button,textarea,select,link,meta,base,svg,math,template').remove();
  const allowed = new Set('p br hr h1 h2 h3 h4 h5 h6 ul ol li strong b em i u s blockquote pre code a img figure figcaption table thead tbody tfoot tr th td caption div span section article details summary sup sub'.split(' '));
  $('*').each((_, el) => {
    if (!allowed.has(el.tagName)) { $(el).replaceWith($(el).contents()); return; }
    for (const name of Object.keys(el.attribs || {})) {
      const value = el.attribs[name];
      if (name === 'href' && el.tagName === 'a') {
        const url = safeUrl(value); if (url) $(el).attr(name,url); else $(el).removeAttr(name);
      } else if (name === 'src' && el.tagName === 'img') {
        const url = safeUrl(value,true); if (url) $(el).attr(name,url); else $(el).removeAttr(name);
      } else if (!['alt','title','colspan','rowspan'].includes(name)) $(el).removeAttr(name);
    }
    if (el.tagName === 'img') $(el).attr({loading:'lazy',decoding:'async'});
  });
  $('h1').each((_, el) => { el.tagName = 'h2'; });
  return $.html();
}
function normalize(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid article JSON');
  const id = String(payload.id ?? payload.slug ?? '');
  const slug = String(payload.slug ?? '');
  const title = String(payload.title ?? '').trim();
  if (!id || id.length > 200 || !SLUG.test(slug) || slug.length > 180 || !title || title.length > 300) throw new Error('Article needs a valid id, title, and lowercase hyphenated slug');
  if (staticSlugs.has(slug) && (!payload.languageCode || /^en(?:-|$)/i.test(payload.languageCode))) throw new Error('This slug belongs to an existing website guide; use a different slug');
  if (typeof payload.content_html !== 'string' || !payload.content_html.trim()) throw new Error('Article needs content_html');
  const content = sanitize(payload.content_html);
  const $ = cheerio.load(content);
  if (!$('body').text().trim()) throw new Error('Article content is empty after validation');
  const sourceDate = payload.publishedAt || payload.published_at || payload.createdAt || payload.created_at;
  const date = new Date(sourceDate || Date.now());
  const language = String(payload.languageCode || payload.lang || 'en').slice(0,35);
  return {id,slug,title,description:String(payload.metaDescription || payload.meta_description || $('body').text().replace(/\s+/g,' ').trim().slice(0,180)).slice(0,500),content,
    heroImage:payload.featureImageEnabled === false ? '' : safeUrl(payload.heroImageUrl || payload.hero_image_url || '',true),heroAlt:String(payload.heroImageAlt || title).slice(0,500),language:/^[a-zA-Z-]+$/.test(language)?language:'en',
    publishedAt:Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString(),hasSourceDate:!!sourceDate,updatedAt:new Date().toISOString(),markdown:typeof payload.content_markdown === 'string'?payload.content_markdown:'',jsonLd:structuredData(payload.jsonLd),faqJsonLd:structuredData(payload.faqJsonLd),publishedUrl:articleUrl({slug,language})};
}
function structuredData(value) {
  if (typeof value === 'string') {try {value = JSON.parse(value);} catch {return null;}}
  return value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : null;
}
async function articles() {
  const entries = []; let cursor;
  do { const page = await blob.list({prefix:PREFIX,limit:1000,cursor}); entries.push(...page.blobs); cursor = page.hasMore ? page.cursor : undefined; } while(cursor);
  const values = [];
  for (let i = 0; i < entries.length; i += 8) {
    values.push(...await Promise.all(entries.slice(i,i+8).map(async item => {
      const result = await blob.get(item.url,{access:'private',useCache:false});
      if (!result) throw new Error('Article storage read failed');
      const article = JSON.parse(await new Response(result.stream).text());
      Object.defineProperty(article,'storagePath',{value:item.pathname || new URL(item.url).pathname.slice(1)});
      return article;
    })));
  }
  const deduped = new Map();
  for (const article of values) {
    const key = languageKey(article) + '/' + article.slug;
    const previous = deduped.get(key);
    if (!previous || String(article.updatedAt) > String(previous.updatedAt)) deduped.set(key,article);
  }
  return [...deduped.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
}
async function saveArticle(article, existingArticles) {
  const existing = existingArticles || await articles();
  const previous = existing.find(a=>a.slug === article.slug && languageKey(a) === languageKey(article));
  if (previous && !article.hasSourceDate) article.publishedAt = previous.publishedAt;
  article.publishedUrl = articleUrl(article);
  const key = PREFIX + createHash('sha256').update(languageKey(article) + '/' + article.slug).digest('hex') + '.json';
  const comparable = value => JSON.stringify({...value,updatedAt:undefined,hasSourceDate:undefined});
  if (previous && comparable(previous) === comparable(article)) return article.publishedUrl;
  await blob.put(key,JSON.stringify(article),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:60});
  // Migrate the earlier provider-ID key only after the slug-keyed write succeeds.
  if (previous?.storagePath && previous.storagePath !== key) await blob.del(previous.storagePath);
  if (existingArticles) {const index=existingArticles.indexOf(previous);if(index>=0) existingArticles[index]=article;else existingArticles.push(article);}
  return article.publishedUrl;
}
function renderIndex(values) {
  if (!values.length) return readTemplate();
  const cards = values.map(a=>`<article class="geo-blog-card">${a.heroImage?`<a href="${articlePath(a)}"><img src="${escape(a.heroImage)}" alt="${escape(a.heroAlt)}" loading="lazy" style="width:100%;height:180px;object-fit:cover;border-radius:10px"></a>`:''}<h3><a href="${articlePath(a)}">${escape(a.title)}</a></h3><p>${escape(a.description)}</p><a class="geo-text-link" href="${articlePath(a)}">Read the guide →</a></article>`).join('');
  return readTemplate().replace('<!-- BABYLOVEGROWTH:ARTICLES -->',`<section class="geo-section" id="latest-blog-articles"><h2>Latest Garage Door Guides</h2><div class="geo-blog-grid">${cards}</div></section>`);
}
function renderArticle(a) {
  const $ = cheerio.load(readTemplate());
  const link = articleUrl(a);
  $('title').text(a.title + ' | Valiant Garage Door');
  $('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').attr('content',a.description);
  $('meta[property="og:title"],meta[name="twitter:title"]').attr('content',a.title);
  $('meta[property="og:url"]').attr('content',link);
  $('meta[property="og:type"]').attr('content','article');
  $('link[rel="canonical"]').attr('href',link);
  $('meta[name="keywords"],meta[name^="valiant:"],script[type="application/ld+json"]').remove();
  $('html').attr('lang',a.language);
  if(a.heroImage) $('meta[property="og:image"],meta[name="twitter:image"]').attr('content',a.heroImage);
  const schema = {'@context':'https://schema.org','@type':'BlogPosting','@id':link+'#article',headline:a.title,description:a.description,datePublished:a.publishedAt,dateModified:a.updatedAt,mainEntityOfPage:link,inLanguage:a.language,publisher:{'@type':'Organization',name:'Valiant Garage Door',url:SITE},...(a.heroImage?{image:[a.heroImage]}:{})};
  $('head').append(`<script type="application/ld+json">${json(a.jsonLd || schema)}</script>${a.faqJsonLd?`<script type="application/ld+json">${json(a.faqJsonLd)}</script>`:''}<style>.published-blog-content{line-height:1.8;overflow-wrap:anywhere}.published-blog-content img{max-width:100%;height:auto}.published-blog-content table{display:block;max-width:100%;overflow-x:auto}.published-blog-content pre{white-space:pre-wrap}.published-blog-content a{color:#c5a34d;text-decoration:underline}.published-blog-content h2,.published-blog-content h3{margin-top:1.6em}</style>`);
  $('main').html(`<nav class="geo-breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/blog">Blog</a></nav><article><section class="geo-hero"><p class="geo-eyebrow">Valiant Garage Door · East Bay homeowner guides</p><h1>${escape(a.title)}</h1><p>${escape(a.description)}</p><time datetime="${escape(a.publishedAt)}">${new Date(a.publishedAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})}</time></section><section class="geo-section published-blog-content">${a.heroImage?`<img src="${escape(a.heroImage)}" alt="${escape(a.heroAlt)}" width="1200" style="width:100%;border-radius:12px" fetchpriority="high">`:''}${a.content}</section></article><section class="geo-section geo-cta-strip"><h2>Need help with your garage door?</h2><p>Call <a href="tel:+19254094974">(925) 409-4974</a> or <a href="/quote">request service</a> in Pleasanton and the East Bay.</p><a class="geo-text-link" href="/blog">← All garage door guides</a></section>`);
  return $.html();
}
function renderSitemap(values) {
  const source = fs.readFileSync(path.join(__dirname,'blog-sitemap.xml'),'utf8');
  return source.replace('</urlset>', values.map(a=>`<url><loc>${escape(articleUrl(a))}</loc><lastmod>${escape(a.updatedAt)}</lastmod></url>`).join('\n')+'\n</urlset>');
}
module.exports = {authorized,normalize,articles,saveArticle,renderIndex,renderArticle,renderSitemap,articleUrl,languageKey};

