const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {load} = require('cheerio');
const manifest = require('../fixtures/review-snippets-202610.json');

// A marker alone never exempts content from a preservation check. Only the
// exact, reviewed section on its approved canonical page may be subtracted.
// Keep this fixture pinned to the reviewed PR, not regenerated from candidates.
function stripApprovedReviewSnippets(html) {
  const $ = load(html, {sourceCodeLocationInfo: true});
  const sections = $('[data-valiant-review-snippets]');
  if (!sections.length) return html; // Historical baselines have no additions.
  const canonical = $('link[rel="canonical"]').attr('href');
  const url = new URL(canonical);
  const expected = manifest.sections[url.pathname];
  assert.equal(url.origin, 'https://www.valiantdoor.com', 'review page origin');
  assert.ok(expected, 'review section is not approved for ' + url.pathname);
  assert.equal(sections.length, 1, 'exactly one approved review section');
  assert.ok(sections.is('section') && sections.parent().is('main'), 'reviews stay directly inside main');
  assert.equal(sections.attr('data-valiant-review-snippets'), manifest.version);
  const {startOffset, endOffset} = sections[0].sourceCodeLocation;
  const source = html.slice(startOffset, endOffset);
  assert.equal(createHash('sha256').update(source).digest('hex'), expected.sourceSha256,
    url.pathname + ': review markup, copy, attribution or links changed');
  assert.equal(html[startOffset - 1], '\n', 'review insertion starts on its own line');
  assert.equal(html[endOffset], '\n', 'review insertion ends on its own line');
  return html.slice(0, startOffset - 1) + html.slice(endOffset + 1);
}

module.exports = {manifest, stripApprovedReviewSnippets};
