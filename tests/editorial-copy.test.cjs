const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('cheerio');
const {manifest,normalize,hash,mainDigest,protectedContent}=require('./helpers/editorial-copy.cjs');
const root=path.resolve(__dirname,'..');
const read=route=>fs.readFileSync(path.join(root,'public',route,'index.html'),'utf8');
test('50 requested editorial rewrites retain approved copy and all protected page contracts',()=>{
 assert.equal(Object.keys(manifest.pages).length,50);
 for(const [route,expected]of Object.entries(manifest.pages)){
  const html=read(route),$=load(html);
  assert.equal(mainDigest(html),expected.mainDigest,route+' editorial copy');
  assert.equal(hash(protectedContent(html)),expected.protectedDigest,route+' links, media, navigation, H1, metadata, prices or quotes');
  assert.deepEqual($('main h2').toArray().map(e=>normalize($(e).text())),expected.h2,route+' H2 hierarchy');
 }
});
test('rewritten FAQ markup and structured answers agree exactly',()=>{
 let checked=0;
 for(const route of Object.keys(manifest.pages)){
  const $=load(read(route));const qs=$('main details.geo-faq-item').toArray().map(e=>({name:normalize($(e).find('summary').text()),text:normalize($(e).find('p').text())}));
  if(!qs.length)continue;
  $('script[type="application/ld+json"]').each((i,e)=>{
   const visit=o=>{if(!o||typeof o!=='object')return;
    if([o['@type']].flat().includes('FAQPage')){checked++;assert.deepEqual(o.mainEntity.map(q=>({name:q.name,text:q.acceptedAnswer.text})),qs,route);}
    for(const v of Object.values(o))if(typeof v==='object')Array.isArray(v)?v.forEach(visit):visit(v);
   };visit(JSON.parse($(e).text()));
  });
 }
 assert.ok(checked>=37,'FAQ coverage must not disappear');
});
test('the 15 previously templated guides have distinct substantive paragraphs and descriptive H2s',()=>{
 const slugs=['bent-garage-door-track-repair','broken-spring-repair-east-bay','emergency-garage-door-response-time-east-bay','frayed-cable-warning-signs','garage-door-maintenance-east-bay','garage-door-motor-hums-wont-move','garage-door-remote-keypad-issues','garage-door-roller-replacement','garage-door-tune-up-checklist-east-bay','garage-door-weather-seal-replacement','heavy-garage-door-diagnosis','liftmaster-error-codes-guide','opener-flashing-light-troubleshooting','same-day-garage-door-repair-east-bay','snapped-garage-door-cable-repair'];
 const paragraphs=new Map();
 for(const slug of slugs){const $=load(read('blog/'+slug));
  const headings=$('main h2').toArray().map(e=>normalize($(e).text()));
  for(const generic of ['Direct Answer','Warning Signs','What Valiant Checks','Local Service Context','FAQ'])assert.ok(!headings.includes(generic),slug+': '+generic);
  // Assess instructional text, not a shared booking link, credentials or captions of the same evidence.
  $('.valiant-process-reference,[data-valiant-related-static-guides],.valiant-seo-reference,.service-proof-section,.proof-gallery-section').remove();
  $('.geo-intro,.geo-card p,.geo-faq-item p').each((i,e)=>{let text=normalize($(e).text());if(text.split(' ').length<18)return;assert.ok(!paragraphs.has(text),slug+' repeats '+paragraphs.get(text));paragraphs.set(text,slug);});
 }
 assert.ok(paragraphs.size>=90);
});
