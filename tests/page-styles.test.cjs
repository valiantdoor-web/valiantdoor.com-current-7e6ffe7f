const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
const manifest = require('../data/site-asset-versions.json');
const root = path.resolve(__dirname, '..');
for (const name of ['review-excerpts', 'wayne-dalton']) {
  test(`${name}: minification preserves every CSS rule and declaration`, () => {
    const source = fs.readFileSync(path.join(root, `public/css/${name}.css`), 'utf8');
    const output = fs.readFileSync(path.join(root, `public/css/${name}.min.css`), 'utf8');
    const rules = css => {
      const dom = new JSDOM(`<style>${css}</style>`);
      const result = Array.from(dom.window.document.styleSheets[0].cssRules, r => r.cssText);
      dom.window.close(); return result;
    };
    assert.deepEqual(rules(output), rules(source));
    assert.ok(Buffer.byteLength(output) <= Buffer.byteLength(source));
    const hash = crypto.createHash('sha256').update(output.trimEnd()).digest('hex').slice(0, 12);
    assert.equal(manifest[`/css/${name}.css`], `/css/${name}.min.css?v=${hash}`);
  });
}
test('all HTML references use the current compact stylesheet version', () => {
  const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []);
  let count = 0;
  for (const file of [...walk(path.join(root,'public')),path.join(root,'lib/blog-index.html')]) {
    for (const [url] of fs.readFileSync(file,'utf8').matchAll(/\/css\/(?:review-excerpts|wayne-dalton)(?:\.min)?\.css(?:\?[^"'\s<>]*)?/g)) {
      assert.equal(url, manifest[url.split('?')[0]], file); count++;
    }
  }
  assert.equal(count, 7);
});
