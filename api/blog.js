const publishing = require('../lib/blog-publishing');
module.exports = async (req,res) => {
  if(!['GET','HEAD'].includes(req.method)) {res.setHeader('Allow','GET, HEAD');res.statusCode=405;return res.end();}
  const slug = req.query?.slug;
  const language = String(req.query?.language || 'en').toLowerCase();
  if (!/^[a-z]{2,3}$/.test(language)) {res.statusCode=404;return res.end('Article not found');}
  const sitemap = req.query?.view === 'sitemap';
  if(slug && (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {res.statusCode=404;return res.end('Article not found');}
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',sitemap?'application/xml; charset=utf-8':'text/html; charset=utf-8');
  try {
    const values = process.env.BLOB_READ_WRITE_TOKEN ? await publishing.articles() : [];
    let html;
    if(slug) {
      const article = values.find(a=>a.slug === slug && publishing.languageKey(a) === language);
      if(!article) {res.statusCode=404;return res.end('Article not found');}
      html = publishing.renderArticle(article);
    } else html = sitemap ? publishing.renderSitemap(values) : publishing.renderIndex(values);
    res.statusCode=200;return res.end(req.method === 'HEAD'?'':html);
  } catch(error) {
    console.error('Blog read failed',{name:error.name});
    if(!slug) {res.statusCode=200;return res.end(req.method==='HEAD'?'':(sitemap?publishing.renderSitemap([]):publishing.renderIndex([])));}
    res.statusCode=503;res.setHeader('Retry-After','30');return res.end('Article temporarily unavailable. Please try again.');
  }
};
