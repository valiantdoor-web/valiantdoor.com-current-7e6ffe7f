const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {normalizeGraph,BUSINESS_ID}=require('../lib/blog-business-schema');
const creator={'@type':'Organization','@id':BUSINESS_ID,name:'Valiant Garage Door LLC'};
test('image creator remains an explicit Organization through repeated compilation',()=>{
 const image={'@type':'ImageObject',contentUrl:'https://www.valiantdoor.com/example.jpg',creator:{'@id':BUSINESS_ID},copyrightNotice:'Existing copyright',license:'https://www.valiantdoor.com/terms#image-licensing',acquireLicensePage:'https://www.valiantdoor.com/terms#image-licensing'};
 const graph=normalizeGraph([image]);
 assert.deepEqual(graph['@graph'].find(x=>x['@type']==='ImageObject'),{...image,creator});
 assert.deepEqual(normalizeGraph([graph]),graph);
});
test('third-party creators and non-image references are not rewritten',()=>{
 const photographer={'@type':'Person',name:'Original photographer'};
 const graph=normalizeGraph([{'@type':'ImageObject',creator:photographer},{'@type':'Service',provider:{'@id':BUSINESS_ID}}]);
 assert.deepEqual(graph['@graph'].find(x=>x['@type']==='ImageObject').creator,photographer);
 assert.deepEqual(graph['@graph'].find(x=>x['@type']==='Service').provider,{'@id':BUSINESS_ID});
});
test('all existing Valiant image metadata retains licensing and explicitly typed creator',()=>{
 const root=path.join(__dirname,'../public');let checked=0;
 for(const file of fs.readdirSync(root,{recursive:true}).filter(x=>x.endsWith('.html'))){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
   const walk=x=>{if(!x||typeof x!=='object')return;if([x['@type']].flat().includes('ImageObject')&&x.creator?.['@id']===BUSINESS_ID){checked++;assert.deepEqual(x.creator,creator,file);assert.ok(x.contentUrl||x.url,file+': image URL');for(const key of ['copyrightNotice','license','acquireLicensePage'])assert.ok(x[key],file+': '+key)}Object.values(x).forEach(walk)};walk(JSON.parse(match[1]));
  }
 }
 assert.ok(checked>=143,'image coverage must not shrink');
});
