const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('cheerio');
const root=path.resolve(__dirname,'..');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith('.html')?[path.join(d,e.name)]:[]);
test('every FAQPage has actual questions rather than an empty duplicate',()=>{
 let found=0;
 for(const file of walk(path.join(root,'public'))){
  const $=load(fs.readFileSync(file,'utf8'));
  $('script[type="application/ld+json"]').each((i,e)=>{
   const visit=x=>{if(!x||typeof x!=='object')return;
    if([].concat(x['@type']).includes('FAQPage')){
     found++;assert.ok(Array.isArray(x.mainEntity)&&x.mainEntity.length>0,file);
     for(const q of x.mainEntity){assert.equal(q['@type'],'Question',file);assert.ok(q.name&&q.acceptedAnswer?.text,file);}
    }
    Object.values(x).forEach(v=>Array.isArray(v)?v.forEach(visit):visit(v));
   };visit(JSON.parse($(e).text()));
  });
 }
 assert.ok(found>0);
});
test('FAQ page preserves all 14 existing answers without changing their text',()=>{
 const {execFileSync}=require('node:child_process');const relative='public/faq/index.html';
 const old=execFileSync('git',['show','f0c367c:'+relative],{cwd:root,encoding:'utf8'});
 const actual=fs.readFileSync(path.join(root,relative),'utf8');
 const questions = html => { const $=load(html); const out=[]; $('script[type="application/ld+json"]').each((i,e)=>{const d=JSON.parse($(e).text());for(const n of d['@graph']||[d])if(n['@id']==='https://www.valiantdoor.com/faq#faq')out.push(...n.mainEntity);});return out; };
 assert.equal(questions(actual).length,14);assert.deepEqual(questions(actual),questions(old));
});
test('E900 hardware is an informational reference, not an unsupported priced-product snippet',()=>{
 const file=path.join(root,'public/e900-tilt-up-garage-door-repair/index.html');
 const $=load(fs.readFileSync(file,'utf8'));const nodes=[];
 $('script[type="application/ld+json"]').each((i,e)=>{const d=JSON.parse($(e).text());nodes.push(...(d['@graph']||[d]));});
 const hardware=nodes.find(n=>n['@id']==='https://www.valiantdoor.com/e900-tilt-up-garage-door-repair#e900');
 assert.equal(hardware['@type'],'Thing');assert.equal(hardware.offers,undefined);assert.equal(hardware.review,undefined);assert.equal(hardware.aggregateRating,undefined);
 assert.equal(hardware.url,'https://www.e900hardware.com/products/one-piece-garage-hardware-kit');
 assert.ok(nodes.some(n=>[].concat(n['@type']).includes('Service')));
});
