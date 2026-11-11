const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');

function setup(file, before = () => {}) {
  const dom = new JSDOM('<html><head></head><body data-chrome="off"><main></main></body></html>', {
    url: 'https://www.valiantdoor.com/services', runScripts: 'outside-only',
    pretendToBeVisual: true, virtualConsole: new VirtualConsole()
  });
  const w = dom.window;
  w.matchMedia = () => ({matches: false, addEventListener(){}});
  w.fetch = async () => ({ok: true, json: async () => ({})});
  w.IntersectionObserver = class { observe(){} disconnect(){} };
  before(w);
  w.eval(fs.readFileSync('public/js/' + file, 'utf8'));
  return {dom, w};
}

for (const file of ['global-chrome.js', 'global-chrome.min.js']) {
  test(file + ' initializes the official Clarity callable queue before provider script execution', () => {
    const {dom, w} = setup(file);
    try {
      const tag = w.document.querySelector('script[data-valiant-clarity]');
      assert.ok(tag);
      assert.equal(tag.src, 'https://www.clarity.ms/tag/xbiv7tx2p3');
      assert.equal(typeof w.clarity, 'function');
      // Contract observed in the official project bootstrap on 2026-10-27:
      // it reads clarity.v / clarity.t and invokes the callable before loading
      // scripts.clarity.ms. A script element without the queue is insufficient.
      assert.doesNotThrow(() => w.clarity.v);
      w.clarity('start', {projectId: 'xbiv7tx2p3'});
      assert.equal(w.clarity.q.length, 1);
      assert.equal(w.clarity.q[0][0], 'start');
      assert.equal(w.clarity.q[0][1].projectId, 'xbiv7tx2p3');
      w.eval(fs.readFileSync('public/js/' + file, 'utf8'));
      assert.equal(w.document.querySelectorAll('script[data-valiant-clarity]').length, 1);
      assert.equal(w.clarity.q.length, 1);
    } finally { dom.window.close(); }
  });
  test(file + ' preserves an existing Clarity instance and its pending consent commands', () => {
    const existing = function() {};
    existing.q = [['consentv2', {ad_Storage: 'denied', analytics_Storage: 'denied'}]];
    existing.v = 'existing';
    const {dom, w} = setup(file, w => { w.clarity = existing; });
    try { assert.equal(w.clarity, existing); assert.equal(w.clarity.q.length, 1); }
    finally { dom.window.close(); }
  });
}
