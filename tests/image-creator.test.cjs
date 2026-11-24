const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('cheerio');
const {normalizeGraph,BUSINESS_ID,profile}=require('../lib/blog-business-schema');
const {renderArticle,renderIndex}=require('../lib/blog-publishing');
const creator={'@type':'Organization','@id':BUSINESS_ID,name:profile.name};
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

// A JSON-LD consumer merges nodes sharing @id, including inline image creators.
// Check all definitions rather than overwriting a conflicting name in a map.
function assertConsistentEntityNames(html, label) {
 const namesById = new Map();
 let business;
 for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
  const walk = node => {
   if (!node || typeof node !== 'object') return;
   if (node['@id'] && node.name) {
    if (!namesById.has(node['@id'])) namesById.set(node['@id'], new Set());
    for (const name of [node.name].flat()) namesById.get(node['@id']).add(name);
   }
   if (node['@id'] === BUSINESS_ID && node.legalName) business = node;
   Object.values(node).forEach(walk);
  };
  walk(JSON.parse(match[1]));
 }
 for (const [id, names] of namesById) assert.equal(names.size, 1, label + ': conflicting names for ' + id + ': ' + [...names].join(' / '));
 if (business) {
  assert.equal(business.name, profile.name, label + ': business display name');
  assert.equal(business.legalName, profile.legalName, label + ': legal name preserved');
 }
 return namesById.has(BUSINESS_ID);
}
test('regression detects conflicting names on the same merged entity', () => {
 const html = '<script type="application/ld+json">' + JSON.stringify({'@graph': [
  {'@id': BUSINESS_ID, name: profile.name},
  {'@type': 'ImageObject', creator: {'@type': 'Organization', '@id': BUSINESS_ID, name: profile.legalName}}
 ]}) + '</script>';
 assert.throws(() => assertConsistentEntityNames(html, 'conflicting fixture'), /conflicting names/);
});
test('all static pages and the runtime template have consistent merged entity names', () => {
 const root = path.join(__dirname, '../public');
 const files = fs.readdirSync(root, {recursive: true}).filter(x => x.endsWith('.html')).map(x => path.join(root, x));
 files.push(path.join(__dirname, '../lib/blog-index.html'));
 let checked = 0;
 for (const file of files) if (assertConsistentEntityNames(fs.readFileSync(file, 'utf8'), file)) checked++;
 assert.ok(checked >= 360, 'business schema coverage must not shrink');
});
test('live article rendering normalizes imported image creator names without changing rights', () => {
 const rights = {copyrightNotice: 'Original copyright notice', license: 'https://www.valiantdoor.com/terms#image-licensing', acquireLicensePage: 'https://www.valiantdoor.com/terms#image-licensing'};
 const article = {slug: 'image-identity-regression', title: 'Image identity regression', description: 'A local regression fixture.', content: '<h2>Existing heading</h2><p>Existing copy.</p>', language: 'en', publishedAt: '2026-10-12T12:00:00Z', updatedAt: '2026-10-12T12:00:00Z', jsonLd: {'@context': 'https://schema.org', '@type': 'BlogPosting', headline: 'Image identity regression', image: {'@type': 'ImageObject', contentUrl: 'https://www.valiantdoor.com/example.jpg', creator: {'@type': 'Organization', '@id': BUSINESS_ID, name: profile.legalName}, ...rights}}};
 const html = renderArticle(article);
 assert.equal(assertConsistentEntityNames(html, 'renderArticle'), true);
 for (const value of Object.values(rights)) assert.ok(html.includes(value), 'existing image rights retained');
 const $ = load(html);
 assert.equal($('.published-blog-content h2').text(), 'Existing heading');
 assert.equal($('.published-blog-content p').text(), 'Existing copy.');
 assert.equal(assertConsistentEntityNames(renderIndex([]), 'renderIndex'), true);
});
