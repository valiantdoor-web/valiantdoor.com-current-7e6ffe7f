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
  const ids=fs.readdirSync(dest).filter(id=>/^\d+$/.test(id));
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
