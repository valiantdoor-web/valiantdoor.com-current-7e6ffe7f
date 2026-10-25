const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {load}=require('cheerio');
const {refresh,cities,areaSources,titles,guides}=require('../scripts/refresh-seo-reference.cjs');
const root=path.resolve(__dirname,'..');
const read=route=>fs.readFileSync(path.join(root,'public',route,'index.html'),'utf8');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);
function originalText(html){const $=load(html);$('script,style,[data-valiant-seo-reference]').remove();return $('body').text().replace(/\s+/g,' ').trim();}
test('SEO additions preserve earlier copy except the explicit 2026-10-25 editorial rewrites',()=>{
  const routes=new Set([...areaSources,...Object.keys(titles),...guides.keys()]);
  for(const route of routes){
    const relative='public/'+(route?route+'/':'')+'index.html';
    const original=execFileSync('git',['show','2803ee7:'+relative],{cwd:root,encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
    // Compare to the existing build pipeline's credential rendering, not a
    // stale checked-in copy of those generated details.
    const {addCredentialDetails}=require('../lib/blog-business-schema');
    const {manifest,mainDigest}=require('./helpers/editorial-copy.cjs');
    if(manifest.pages[route]) {
      assert.equal(mainDigest(read(route)),manifest.pages[route].mainDigest,route);
      const stripMain=html=>{const $=load(html);$('main').remove();return originalText($.html());};
      assert.equal(stripMain(read(route)),stripMain(addCredentialDetails(original)),route+' non-editorial body');
    } else assert.equal(originalText(read(route)),originalText(addCredentialDetails(original)),route||'/');
  }
});
test('the exact approved search titles remain synchronized with social titles',()=>{
  for(const [route,title] of Object.entries(titles)){
    const $=load(read(route));assert.equal($('title').text(),title);assert.ok(title.length<=70);
    for(const sel of ['meta[property="og:title"]','meta[name="twitter:title"]']) if($(sel).length)assert.equal($(sel).attr('content'),title);
  }
});
test('all seven core cities have at least 30 distinct indexable static linking pages',()=>{
  const incoming=new Map(cities.map(([city,route])=>['/'+route,new Set()]));
  for(const file of walk(path.join(root,'public'))){
    const $=load(fs.readFileSync(file,'utf8'));if(/noindex/i.test($('meta[name="robots"]').attr('content')||''))continue;
    const source=$('link[rel="canonical"]').attr('href');if(!source)continue;
    $('a[href]').each((i,e)=>{try{const url=new URL($(e).attr('href'),source);const key=url.pathname.replace(/\/$/,'');if(url.origin==='https://www.valiantdoor.com'&&incoming.has(key)&&source.replace(/\/$/,'')!==url.href.replace(/\/$/,''))incoming.get(key).add(source)}catch{}});
  }
  for(const [route,sources] of incoming)assert.ok(sources.size>=30,`${route}: ${sources.size}`);
});
test('additions only link existing routes and retain canonical and existing indexing contracts',()=>{
  const redirectSources=new Set(require('../vercel.json').redirects.map(rule=>rule.source));
  assert.ok(areaSources.every(route=>!redirectSources.has('/'+route)),'no link blocks are added to redirect-only pages');
  for(const route of new Set([...areaSources,...guides.keys()])){
    const $=load(read(route));const source=$('link[rel="canonical"]').attr('href');
    assert.ok(source,'canonical retained: '+route);
    $('[data-valiant-seo-reference] a[href^="/"]').each((i,e)=>{
      const target=$(e).attr('href').replace(/^\//,'');assert.ok(fs.existsSync(path.join(root,'public',target,'index.html')),target);
    });
    if($('[data-valiant-seo-reference]').length) assert.equal($('link[href="/css/seo-reference-additions.css?v=20261024"]').length,1);
  }
  // Notion's noindex assertion is stale: the current source has an explicit
  // indexable urgent-page contract. Do not reverse that decision silently.
  const current=load(read('nextdoor-emergency-repair'));
  const original=load(execFileSync('git',['show','2803ee7:public/nextdoor-emergency-repair/index.html'],{cwd:root,encoding:'utf8'}));
  assert.equal(current('meta[name="robots"]').attr('content'),original('meta[name="robots"]').attr('content'));
  assert.equal(current('link[rel="canonical"]').attr('href'),original('link[rel="canonical"]').attr('href'));
});
test('business facts use E164 phones, the seven existing service cities, and the known alternate name',()=>{
  const {profile}=require('../lib/blog-business-schema');
  assert.equal(profile.telephone,'+19254094974');assert.equal(profile.contactPoint[0].telephone,profile.telephone);
  assert.equal(profile.alternateName,'Valiant Garage Doors');
  assert.equal(profile.address.streetAddress,'3588 Pimlico Dr');
  assert.deepEqual(profile.areaServed.map(c=>c.name.split(',')[0]).sort(),cities.map(c=>c[0]).sort());
  for(const file of walk(path.join(root,'public'))){
    const $=load(fs.readFileSync(file,'utf8'));if(/noindex/i.test($('meta[name="robots"]').attr('content')||''))continue;
    $('script[data-valiant-business-graph]').each((i,e)=>{
      const business=JSON.parse($(e).text())['@graph'].find(n=>n['@id']===profile['@id']);if(!business)return;
      assert.equal(business.telephone,profile.telephone,file);assert.equal(business.alternateName,profile.alternateName,file);
      assert.deepEqual(business.address,profile.address,file);assert.equal(business.aggregateRating,undefined,file);
    });
  }
});
test('emergency summary states phone intake, conditional dispatch, and existing fee without changing prices',()=>{
  const $=load(read('emergency-garage-door-repair'));const text=$('[data-valiant-seo-reference="emergency"]').text();
  assert.match(text,/phone 24\/7/);assert.match(text,/Dispatch timing depends/);assert.match(text,/7:00 PM/);assert.match(text,/\$100/);assert.match(text,/before work begins/);
  assert.ok($('h1').length===1);assert.match(read('emergency-garage-door-repair'),/<h1>[\s\S]*data-valiant-seo-reference="emergency"/);
  const summary=fs.readFileSync(path.join(root,'public/llms.txt'),'utf8').split('## Official business summary')[1].split('##')[0];
  for(const [city] of cities)assert.ok(summary.includes(city),city);
});
test('the already-distinct dynamic blog and guide-index descriptions are preserved',()=>{
  const {renderIndex}=require('../lib/blog-publishing');
  const blog=load(renderIndex([]))('meta[name="description"]').attr('content');
  const guide=load(read('repair-guides'))('meta[name="description"]').attr('content');
  assert.notEqual(blog,guide);
});
test('both Dublin service breadcrumbs match the existing visible navigation',()=>{
  for(const route of ['broken-spring-repair-dublin-ca','garage-door-repair-east-dublin']) {
    const $=load(read(route));let nodes=[];
    $('script[type="application/ld+json"]').each((i,e)=>{const graph=JSON.parse($(e).text());nodes.push(...(graph['@graph']||[graph]));});
    const breadcrumbs=nodes.filter(n=>n['@type']==='BreadcrumbList');assert.equal(breadcrumbs.length,1,route);
    const list=breadcrumbs[0].itemListElement;assert.equal(list.length,3);assert.deepEqual(list.map(i=>i.position),[1,2,3]);
    assert.equal(list[0].item,'https://www.valiantdoor.com/');assert.equal(list[1].item,'https://www.valiantdoor.com/service-areas');
    assert.equal(list[2].item,'https://www.valiantdoor.com/'+route);
    assert.equal(list[2].name,$('nav[aria-label="Breadcrumb"]').children('span').last().text().trim());
  }
});
test('the generated additions are idempotent',()=>assert.equal(refresh(),0));
