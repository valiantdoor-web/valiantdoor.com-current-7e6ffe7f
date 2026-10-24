const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const baseline = JSON.parse(execFileSync('git', ['show', 'c6932dbe260a2bad94bb10b87a850d61650e369b:vercel.json'], {encoding:'utf8'}));
const origins = ['https://analytics.google.com', 'https://stats.g.doubleclick.net'];
test('Google diagnostic endpoints are allowed only in connect-src', () => {
 const h = config.headers.flatMap(rule => rule.headers).find(h => h.key === 'Content-Security-Policy');
 const directives = h.value.split(';').map(s => s.trim().split(/\s+/));
 for (const origin of origins) {
  assert.deepEqual(directives.filter(d => d.includes(origin)).map(d => d[0]), ['connect-src']);
  assert.equal(h.value.split(origin).length - 1, 1);
 }
});
test('all other policy directives, headers, redirects and config remain unchanged', () => {
 const copy = structuredClone(config);
 const h = copy.headers.flatMap(rule => rule.headers).find(h => h.key === 'Content-Security-Policy');
 for (const origin of origins) h.value = h.value.replace(' '+origin, '');
 assert.deepEqual(copy, baseline);
});
