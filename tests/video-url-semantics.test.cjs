const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {transform, correctGraph, sameDocument} = require('../scripts/refresh-video-url-semantics.cjs');
const root = path.resolve(__dirname, '..');
const baseline = '38b690cbc24cfe05e6ee99026d95a40688e9e9d4';
const ld = () => /(<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script\s*>)/gi;
const graphs = html => [...html.matchAll(ld())].map(m => JSON.parse(m[2]));
const outside = html => html.replace(ld(), '$1__JSON_LD_BODY__$3');
function nodes(graph) { const out=[]; (function visit(x) { if(!x || typeof x !== 'object') return; if(!Array.isArray(x) && [].concat(x['@type'] || []).includes('VideoObject')) out.push(x); Object.values(x).forEach(visit); })(graph); return out; }
const html = (graph, canonical='https://www.valiantdoor.com/videos/test') => `<html><head><link href="${canonical}" rel="canonical"><script type="application/ld+json">\n${JSON.stringify(graph)}\n</script></head><body><h1>Owner text</h1><video controls src="/file.mp4"></video></body></html>`;

test('all 88 diagnosed baseline pages lose only the bad optional VideoObject property', () => {
  const files = execFileSync('git',['ls-tree','-r','--name-only',baseline,'--','public/videos','public/garage-door-spring-replacement/index.html'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(f=>f.endsWith('.html'));
  let changed=0, removedContent=0, removedEmbed=0;
  for(const file of files) {
    const before=execFileSync('git',['show',`${baseline}:${file}`],{cwd:root,encoding:'utf8'});
    const after=transform(before);
    assert.equal(outside(after),outside(before),file+' visible HTML changed');
    assert.equal(transform(after),after,file+' not idempotent');
    const beforeGraphs=graphs(before), afterGraphs=graphs(after), expected=structuredClone(beforeGraphs);
    for(let i=0;i<expected.length;i++)for(const node of nodes(expected[i])) {
      if(file==='public/garage-door-spring-replacement/index.html' && node.contentUrl==='https://www.youtube.com/watch?v=t65x9q7ssRU') { delete node.contentUrl; removedContent++; }
      const canonical='https://www.valiantdoor.com/'+file.replace(/^public\//,'').replace(/\/index\.html$/,'');
      if(file.startsWith('public/videos/') && node.embedUrl===canonical && /\.mp4(?:\?|$)/.test(node.contentUrl || '')) { delete node.embedUrl; removedEmbed++; }
    }
    assert.deepEqual(afterGraphs,expected,file+' other graph fields changed');
    if(after!==before)changed++;
    const current=fs.readFileSync(path.join(root,file),'utf8');
    assert.equal(transform(current),current,file+' shipped source still has bad URL semantics');
    assert.deepEqual(nodes(graphs(current)),nodes(afterGraphs),file+' video metadata or transport changed');
  }
  assert.equal(changed,88); assert.equal(removedContent,1); assert.equal(removedEmbed,87);
});

test('valid player URLs, unrelated schema properties and a sole/mismatched transport remain unchanged', () => {
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'VideoObject', contentUrl:'https://cdn.example.com/media.mp4', embedUrl:'https://www.valiantdoor.com/embed/test', name:'Native video', thumbnailUrl:'/thumb.webp', uploadDate:'2026-06-23'},
    {'@type':'VideoObject', contentUrl:'https://www.youtube.com/watch?v=one', embedUrl:'https://www.youtube.com/embed/two'},
    {'@type':'VideoObject', contentUrl:'https://www.youtube.com/watch?v=one'},
    {'@type':'VideoObject', embedUrl:'https://www.valiantdoor.com/videos/test'},
    {'@type':'ImageObject',contentUrl:'https://www.youtube.com/watch?v=one',embedUrl:'https://www.valiantdoor.com/videos/test',creator:{'@type':'Organization',name:'Owner'}},
    {'@type':'WebPage',url:'https://www.valiantdoor.com/videos/test',embedUrl:'https://www.valiantdoor.com/videos/test'}
  ]};
  const before=html(graph); assert.equal(transform(before),before);
});

test('matching YouTube player permits removing only its watch-page contentUrl', () => {
  const graph={'@type':['CreativeWork','VideoObject'],name:'Keep name',contentUrl:'https://www.youtube.com/watch?v=same',embedUrl:'https://www.youtube-nocookie.com/embed/same',description:'Keep <text>',uploadDate:'2026-06-23'};
  const result=graphs(transform(html(graph)))[0]; const expected=structuredClone(graph);delete expected.contentUrl;
  assert.deepEqual(result,expected);
  assert.ok(result.embedUrl);assert.equal(result.uploadDate,'2026-06-23');
});

test('native transport remains intact when optional self-watch embed is removed', () => {
  const graph={'@type':'VideoObject',contentUrl:'https://cdn.example.com/video.MP4?token=public',embedUrl:'https://www.valiantdoor.com/videos/test/',thumbnailUrl:['https://cdn.example.com/thumb.webp'],creator:{'@type':'Organization',name:'Valiant'}};
  const expected=structuredClone(graph);delete expected.embedUrl;
  assert.deepEqual(graphs(transform(html(graph)))[0],expected);
  assert.equal(sameDocument('https://evil.example/videos/test','https://www.valiantdoor.com/videos/test'),false);
});

test('invalid JSON and unknown URL protocols are left alone; generated JSON remains script-safe', () => {
  const malformed='<script type="application/ld+json">{broken</script>';assert.equal(transform(malformed),malformed);
  const graph={'@type':'VideoObject',contentUrl:'data:video/mp4;base64,AA',embedUrl:'https://www.valiantdoor.com/videos/test'};
  const before=html(graph);assert.equal(transform(before),before);
  const safe={'@type':'VideoObject',contentUrl:'https://cdn.example.com/x.mp4',embedUrl:'https://www.valiantdoor.com/videos/test',description:'</script><img onerror="bad">'};
  const safeBody=JSON.stringify(safe).replace(/</g,'\\u003c');
  const transformed=transform(html(safe).replace(JSON.stringify(safe),safeBody));
  assert.ok(transformed.includes('\\u003c/script>'));
  assert.equal(graphs(transformed)[0].description,safe.description);
});

test('video XML sitemap is byte-identical to the release baseline', () => {
  const file='public/sitemap-video.xml';
  assert.equal(fs.readFileSync(path.join(root,file),'utf8'),execFileSync('git',['show',`${baseline}:${file}`],{cwd:root,encoding:'utf8'}));
});
