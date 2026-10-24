const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {load}=require('cheerio');
const {refresh}=require('../scripts/refresh-related-projects.cjs');
const p=require('../lib/blog-publishing');
const titles=require('../lib/blog-seo-titles.json');
test('all published project pages gain two valid sibling links; originals and idempotency preserved',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'valiant-related-projects-'));
 try{
  const source=path.resolve(__dirname,'../public/portfolio/projects'),dest=path.join(dir,'public/portfolio/projects');
  fs.cpSync(source,dest,{recursive:true});
  fs.copyFileSync(path.resolve(__dirname,'../public/sitemap-portfolio.xml'),path.join(dir,'public/sitemap-portfolio.xml'));
  const allIds=fs.readdirSync(dest).filter(id=>/^\d+$/.test(id));
  const sitemap=fs.readFileSync(path.join(dir,'public/sitemap-portfolio.xml'),'utf8');
  const ids=allIds.filter(id=>sitemap.includes('/portfolio/projects/'+id+'</loc>'));
  const excluded=new Map(allIds.filter(id=>!ids.includes(id)).map(id=>[id,fs.readFileSync(path.join(dest,id,'index.html'),'utf8')]));
  for(const id of ids){const f=path.join(dest,id,'index.html');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/<section\b[^>]*data-valiant-related-projects[^>]*>[\s\S]*?<\/section>/g,''));}
  const originals=new Map(ids.map(id=>[id,fs.readFileSync(path.join(dest,id,'index.html'),'utf8')]));
  assert.equal(refresh(dir),ids.length);
  const incoming=new Map(ids.map(id=>[id,new Set()]));
  for(const id of ids){
   const html=fs.readFileSync(path.join(dest,id,'index.html'),'utf8'),$=load(html);
   const links=$('[data-valiant-related-projects] a');assert.equal(links.length,2);
   links.each((i,a)=>{const target=$(a).attr('href').split('/').pop();assert.notEqual(target,id);assert.ok(incoming.has(target));incoming.get(target).add(id)});
   assert.equal(html.replace(/<section\b[^>]*data-valiant-related-projects[^>]*>[\s\S]*?<\/section>/g,''), originals.get(id));
  }
  for(const count of incoming.values())assert.equal(count.size,2);
  assert.equal(refresh(dir),0);
  for(const [id,html] of excluded)assert.equal(fs.readFileSync(path.join(dest,id,'index.html'),'utf8'),html);
  assert.equal(excluded.size,217);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('short search titles preserve full article headings and provide two language-safe incoming links',()=>{
 const values=Object.keys(titles).map((slug,i)=>({slug,title:'Original full article heading '+i,description:'Documented guide.',language:'en',content:'<p>Original content.</p>',publishedAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z'}));
 const incoming=new Map(values.map(a=>[a.slug,new Set()]));
 for(const a of values){
  const $=load(p.renderArticle(a,[...values,{...a,slug:'spanish-only',language:'es'}]));
  assert.equal($('title').text(),titles[a.slug]);assert.ok($('title').text().length<=70);assert.equal($('h1').text(),a.title);assert.equal($('.published-blog-content').text(),'Original content.');
  assert.equal($('[data-valiant-related-guides] a').length,2);
  $('[data-valiant-related-guides] a').each((i,e)=>{const slug=$(e).attr('href').split('/').pop();assert.ok(incoming.has(slug));assert.notEqual(slug,a.slug);incoming.get(slug).add(a.slug)});
 }
 for(const sources of incoming.values())assert.equal(sources.size,2);
 assert.equal(new Set(Object.values(titles)).size,12);
 const $=load(p.renderArticle(values[0],[]));assert.equal($('[data-valiant-related-guides]').length,0);
});
test('the nine previously isolated static guides retain their content and gain two incoming links each',()=>{
 const {execFileSync}=require('node:child_process');const root=path.resolve(__dirname,'..');
 const slugs=['bent-garage-door-track-repair','broken-spring-repair-east-bay','garage-door-motor-hums-wont-move','garage-door-remote-keypad-issues','garage-door-tune-up-checklist-east-bay','garage-door-weather-seal-replacement','liftmaster-error-codes-guide','opener-flashing-light-troubleshooting','same-day-garage-door-repair-east-bay'];
 const incoming=new Map(slugs.map(s=>[s,new Set()]));
 for(const slug of slugs){
  const file=`public/blog/${slug}/index.html`,html=fs.readFileSync(path.join(root,file),'utf8'),$=load(html);
  const old=execFileSync('git',['show','86910b1:'+file],{cwd:root,encoding:'utf8'});
  // Compare article content, not credentials regenerated during the normal build.
  const before=load(old);assert.equal($('h1').text(),before('h1').text());
  const section=$('[data-valiant-related-static-guides]');assert.equal(section.length,1);assert.equal(section.find('a').length,2);
  section.find('a').each((i,a)=>{const target=$(a).attr('href').split('/').pop();assert.ok(incoming.has(target));assert.notEqual(target,slug);incoming.get(target).add(slug)});
  section.remove();assert.equal($('main').text(),before('main').text());
 }
 for(const links of incoming.values())assert.equal(links.size,2);
});
