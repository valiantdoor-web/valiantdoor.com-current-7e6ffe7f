const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {load}=require('cheerio');
const {refresh,cities,answers,proof,titles,descriptions,routes}=require('../scripts/refresh-seo-completion.cjs');
const {profile,normalizeGraph,addCredentialDetails}=require('../lib/blog-business-schema');
const root=path.resolve(__dirname,'..');
const read=route=>fs.readFileSync(path.join(root,'public',route,'index.html'),'utf8');
function ownerText(html){const $=load(addCredentialDetails(html));$('script,style,[data-valiant-seo-completion]').remove();return $('body').text().replace(/\s+/g,' ').trim();}
test('all existing owner body copy, FAQs and navigation survive the approved additions',()=>{
  for(const route of routes){
    const baseline=execFileSync('git',['show','6252d52:public/'+route+'/index.html'],{cwd:root,encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
    assert.equal(ownerText(read(route)),ownerText(baseline),route);
    const $=load(read(route)),old=load(baseline);
    assert.equal($('h1').length,1,route);
    assert.equal($('link[rel="canonical"]').attr('href'),old('link[rel="canonical"]').attr('href'),route);
    assert.equal($('meta[name="robots"]').attr('content'),old('meta[name="robots"]').attr('content'),route);
  }
});
test('approved hours override old schema hours while preserving service-specific offers',()=>{
  const graph=normalizeGraph([{'@type':'LocalBusiness',name:'Valiant Garage Door',openingHours:'Mo-Fr 09:00-17:00',openingHoursSpecification:{opens:'09:00',closes:'17:00'},makesOffer:{'@type':'Offer',name:'Existing service',price:'149'}}]);
  const b=graph['@graph'].find(n=>n['@id']===profile['@id']);
  assert.equal(b.openingHours,'Mo-Su 00:00-23:59');
  assert.deepEqual(b.openingHoursSpecification,profile.openingHoursSpecification);
  assert.equal(b.openingHoursSpecification[0].dayOfWeek.length,7);
  assert.equal(b.openingHoursSpecification[0].opens,'00:00');assert.equal(b.openingHoursSpecification[0].closes,'23:59');
  assert.equal(b.makesOffer[0].price,'149');
  assert.match(addCredentialDetails('<html><head></head><body><main></main></body></html>'),/Staffed storefront &amp; phone hours/);
});
test('seven city answers are individually written, answer-first, and followed by accessible published-price tables',()=>{
  assert.equal(new Set(Object.values(answers)).size,7);
  for(const [city,route]of cities){
    const $=load(read(route)),answer=$('[data-valiant-seo-completion="city-answer"]'),prices=$('[data-valiant-seo-completion="city-prices"]');
    const words=answers[city].split(/\s+/).length;assert.ok(words>=40&&words<=60,city+': '+words);
    assert.equal(answer.length,1);assert.ok(answer.text().includes(city));assert.match(answer.text(),/#1160068/);assert.match(answer.text(),/24\/7/);
    assert.ok(read(route).indexOf('<h1')<read(route).indexOf('data-valiant-seo-completion="city-answer"'));
    assert.equal(prices.find('caption').length,1);assert.equal(prices.find('th[scope="col"]').length,2);assert.equal(prices.find('th[scope="row"]').length,4);
    assert.deepEqual(prices.find('tbody td').map((i,e)=>$(e).text()).get(),['From $159','From $189','From $149','From $149']);
    assert.match(prices.text(),/7:00 PM/);assert.match(prices.text(),/\$100/);
    const nodes=[];$('script[type="application/ld+json"]').each((i,e)=>{const g=JSON.parse($(e).text());nodes.push(...(g['@graph']||[g]));});
    const types=nodes.flatMap(n=>[n['@type']].flat());for(const t of ['Service','FAQPage','BreadcrumbList'])assert.ok(types.includes(t),route+': '+t);
    assert.ok(nodes.find(n=>n['@type']==='FAQPage').mainEntity.length>=5,route);
  }
});
test('local proof uses only the exact captions in already-published city-matched records',()=>{
  const projects=JSON.parse(fs.readFileSync(path.join(root,'public/data/project-portfolio.json'))).projects;
  const sitemap=fs.readFileSync(path.join(root,'public/sitemap-portfolio.xml'),'utf8');
  for(const [city,[id,photoId]]of Object.entries(proof)){
    const p=projects.find(p=>p.id===id),photo=p.photos.find(p=>p.id===photoId);assert.equal(p.city,city);assert.ok(sitemap.includes('https://www.valiantdoor.com'+p.url));
    const $=load(read(cities.find(c=>c[0]===city)[1])),block=$('[data-valiant-seo-completion="city-proof"]');
    assert.equal(block.find('blockquote').text(),photo.description);assert.equal(block.find('a').attr('href'),p.url);
  }
  assert.equal(load(read('garage-door-repair-sunol'))('[data-valiant-seo-completion="city-proof"]').length,0,'no made-up Sunol record');
});
test('localized titles/metas are synchronized, concise and do not invent review counts',()=>{
  for(const [route,title]of Object.entries(titles)){
    const $=load(read(route));assert.equal($('title').text(),title);assert.ok(title.length<=70);
    for(const sel of ['meta[property="og:title"]','meta[name="twitter:title"]'])if($(sel).length)assert.equal($(sel).attr('content'),title);
    assert.match($('h1').text(),/Pleasanton/);
  }
  for(const [route,description]of Object.entries(descriptions)){
    const $=load(read(route));assert.ok(description.length<=160,route+': '+description.length);assert.equal($('meta[name="description"]').attr('content'),description);
    for(const sel of ['meta[property="og:description"]','meta[name="twitter:description"]'])if($(sel).length)assert.equal($(sel).attr('content'),description);
    assert.doesNotMatch(description,/\d+\s+(?:reviews|stars)/i);
  }
});
test('near-top service area shortcuts have real destinations and minimum-touch styling',()=>{
  const $=load(read('service-areas')),nav=$('[data-valiant-seo-completion="area-jumps"] nav');
  assert.equal(nav.length,1);assert.equal($('#core-service-cities').length,1);assert.equal($('#live-projects-map').length,1);
  nav.find('a[href^="#"]').each((i,e)=>assert.equal($($(e).attr('href')).length,1));
  assert.ok(read('service-areas').indexOf('data-valiant-seo-completion="area-jumps"')<read('service-areas').indexOf('geo-stats'));
  assert.match(fs.readFileSync(path.join(root,'public/css/seo-completion.css'),'utf8'),/min-height:44px/);
});
test('Vercel-host noindex rule never matches production domains or changes Nextdoor indexing',()=>{
  const rules=require('../vercel.json').headers.filter(r=>r.has?.some(h=>h.type==='host'));
  const rule=rules.find(r=>r.headers.some(h=>h.key.toLowerCase()==='x-robots-tag'&&h.value.includes('noindex')));assert.ok(rule);
  const host=new RegExp('^(?:'+rule.has.find(h=>h.type==='host').value+')$');
  assert.ok(host.test('valiantdoor-com-current-example.vercel.app'));
  for(const h of ['www.valiantdoor.com','valiantdoor.com','www.valiantdoor.io','valiantdoor.io'])assert.ok(!host.test(h),h);
  const $=load(read('nextdoor-emergency-repair'));assert.ok(!/noindex/i.test($('meta[name="robots"]').attr('content')||''));
  assert.equal($('link[rel="canonical"]').attr('href'),'https://www.valiantdoor.com/nextdoor-emergency-repair');
});
test('the new generator is idempotent and all added internal links resolve in the repository',()=>{
  assert.equal(refresh(),0);
  for(const route of routes){const $=load(read(route));$('[data-valiant-seo-completion] a[href^="/"]').each((i,e)=>{const pathname=$(e).attr('href').split(/[?#]/)[0];assert.ok(fs.existsSync(path.join(root,'public',pathname,'index.html')),pathname);});}
});
