const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {load} = require('cheerio');
const {addCredentialDetails, normalizeHtmlSchema} = require('../lib/blog-business-schema');
const {manifest, stripApprovedReviewSnippets} = require('./helpers/review-snippets.cjs');
const root = path.resolve(__dirname, '..');
const read = route => fs.readFileSync(path.join(root, 'public', route, 'index.html'), 'utf8');
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
const baseline = new Map(Object.keys(manifest.sections).map(route => [route,
  execFileSync('git', ['show', manifest.baselineCommit + ':public' + route + '/index.html'],
    {cwd: root, encoding: 'utf8', env: {...process.env, GIT_OPTIONAL_LOCKS: '0'}})]));

function reviewPage(html) {
  const $ = load(html);
  assert.equal($('[data-valiant-review-snippets]').length, 1, 'approved review section is required');
  stripApprovedReviewSnippets(html);
  return $;
}
function assertOriginalSource(html, route) {
  // Match the existing credential, tracking-URL and Speed Insights build
  // steps on both sides. Retain source rather than merely comparing text.
  // The JSON-LD refresh adds a blank head line per run; collapse those only.
  const versions = require('../data/site-asset-versions.json');
  const speedInsights = '<script>window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };</script>\n<script defer src="/_vercel/speed-insights/script.js"></script>\n';
  const compiled = source => {
    if (!source.includes('/_vercel/speed-insights/script.js')) source = source.replace(/<\/head\s*>/i, speedInsights + '</head>');
    return normalizeHtmlSchema(addCredentialDetails(source), {includeBusiness: true})
      .replace(/\/js\/(?:global-chrome|lead-capture|estimate-upload|main)(?:\.min)?\.js(?:\?[^"'\s<>]*)?/g,
        url => versions[url.split('?')[0]] || url)
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, head => head.replace(/(?:\n[\t ]*){2,}/g, '\n'));
  };
  assert.equal(compiled(stripApprovedReviewSnippets(html)),
    compiled(baseline.get(route)), route + ': non-review source changed');
}

test('only the eight approved pages contain the nine reviewed excerpts', () => {
  const marked = walk(path.join(root, 'public')).filter(file =>
    load(fs.readFileSync(file, 'utf8'))('[data-valiant-review-snippets]').length);
  assert.deepEqual(marked.map(file => '/' + path.relative(path.join(root, 'public'), file)
    .split(path.sep).join('/').replace(/\/index\.html$/, '')).sort(), Object.keys(manifest.sections).sort());
  let count = 0;
  for (const route of Object.keys(manifest.sections)) {
    const $ = reviewPage(read(route));
    count += $('[data-valiant-review-snippets] blockquote').length;
  }
  assert.equal(count, 9);
});

test('all eight pages retain non-review source through the existing build steps', () => {
  for (const route of Object.keys(manifest.sections)) assertOriginalSource(read(route), route);
});

test('review quotes, names, dates and accurately labeled Yelp and proof links stay intact', () => {
  assert.ok(fs.existsSync(path.join(root, 'public', manifest.proofPath, 'index.html')));
  for (const [route, expected] of Object.entries(manifest.sections)) {
    const $ = reviewPage(read(route)), section = $('[data-valiant-review-snippets]');
    assert.equal(section.find('figure').length, expected.reviews.length, route);
    const headingId = section.attr('aria-labelledby');
    assert.equal($('[id]').filter((i, e) => $(e).attr('id') === headingId).length, 1, route);
    assert.equal(section.find('h2').attr('id'), headingId, route);
    section.find('figure').each((i, e) => {
      const figure = $(e), review = expected.reviews[i];
      assert.equal(figure.find('blockquote').text(), review.excerpt, route);
      assert.equal(figure.find('figcaption strong').text(), review.reviewer, route);
      assert.equal(figure.find('time').attr('datetime'), review.date, route);
      assert.equal(figure.find('time').text(), review.displayDate, route);
      const link = figure.find('a');
      assert.equal(link.length, 1, route);
      assert.equal(link.attr('href'), manifest.yelpUrl, route);
      assert.equal(link.text(), 'Browse customer reviews on Yelp', route);
      assert.equal(link.attr('target'), '_blank', route);
      assert.deepEqual(link.attr('rel').split(/\s+/).sort(), ['noopener', 'noreferrer'], route);
    });
    assert.equal(section.find('a[href="' + manifest.proofPath + '"]').length, 1, route);
    assert.equal(section.find('script').length, 0, 'no review/star structured data or scripts added');
  }
});

test('review exceptions reject altered attribution, links, extra content and misplaced markers', () => {
  const route = '/garage-door-repair', html = read(route);
  const quote = manifest.sections[route].reviews[0];
  const $ = load(html, {sourceCodeLocationInfo: true});
  const {startOffset, endOffset} = $('[data-valiant-review-snippets]')[0].sourceCodeLocation;
  const insideSection = (before, after) => html.slice(0, startOffset) +
    html.slice(startOffset, endOffset).replace(before, after) + html.slice(endOffset);
  const mutations = new Map([
    ['quote', insideSection(quote.excerpt, 'Unapproved testimonial')],
    ['reviewer', insideSection(quote.reviewer, 'Another reviewer')],
    ['date', insideSection('datetime="' + quote.date + '"', 'datetime="2026-01-01"')],
    ['visible date', insideSection(quote.displayDate, 'January 1, 2026')],
    ['Yelp destination', insideSection(manifest.yelpUrl, manifest.yelpUrl + '?review=unverified')],
    ['Yelp label', insideSection('Browse customer reviews on Yelp', 'Read this exact review')],
    ['proof destination', insideSection('href="' + manifest.proofPath + '"', 'href="/quote"')],
    ['extra copy', insideSection('Real customer feedback</p>', 'Real customer feedback</p><p>Unexpected copy</p>')],
    ['wrapped original copy', insideSection('Real customer feedback</p>', 'Real customer feedback</p><h1>Original text cannot be hidden here</h1>')],
    ['unknown version', insideSection('data-valiant-review-snippets="2026-10"', 'data-valiant-review-snippets="future"')],
    ['unapproved page', html.replace('rel="canonical" href="https://www.valiantdoor.com' + route + '"', 'rel="canonical" href="https://www.valiantdoor.com/unapproved"')],
    ['removed section', stripApprovedReviewSnippets(html)],
    ['duplicate marker', html.replace('</main>', '<section data-valiant-review-snippets="2026-10">Unexpected</section></main>')]
  ]);
  for (const [name, mutated] of mutations) {
    assert.notEqual(mutated, html, name + ': mutation must actually apply');
    assert.throws(() => reviewPage(mutated), {code: 'ERR_ASSERTION'}, name);
  }
});

test('approved reviews never exempt changed, deleted or additional original page content', () => {
  const route = '/garage-door-repair', html = read(route);
  for (const mutated of [
    html.replace(/(<h1\b[^>]*>)/i, '$1Unapproved heading '),
    html.replace(/<p\b[^>]*>[\s\S]*?<\/p>/i, ''),
    html.replace('</main>', '<p>Unapproved new content outside the reviews.</p></main>')
  ]) {
    assert.notEqual(mutated, html);
    assert.throws(() => assertOriginalSource(mutated, route), {code: 'ERR_ASSERTION'});
  }
});
