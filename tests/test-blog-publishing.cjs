const assert=require('node:assert/strict');
const blob=require('@vercel/blob');
const records=new Map();let writes=0;
blob.list=async()=>({blobs:[...records.keys()].filter(k=>k.startsWith('valiant-blog/articles/')).map(path=>({pathname:path,url:'https://store.private.blob.vercel-storage.com/'+path})),hasMore:false});
blob.get=async url=>{const value=records.get(url.includes('.com/')?url.split('.com/')[1]:url);return value?{stream:new Response(value).body}:null;};
blob.put=async(key,value,options)=>{assert.equal(options.access,'private');records.set(key,value);writes++;return {pathname:key};};
blob.del=async key=>records.delete(key);
process.env.BABYLOVEGROWTH_WEBHOOK_SECRET='local-test-secret';process.env.BLOB_READ_WRITE_TOKEN='mock';
const p=require('../lib/blog-publishing');const hook=require('../api/blog-webhook');const blog=require('../api/blog');
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};}
async function request(handler,req){const res=response();await handler(req,res);return res;}
(async()=>{
let r=await request(hook,{method:'POST',headers:{},body:{}});assert.equal(r.statusCode,401);
const headers={authorization:'Bearer local-test-secret'};
r=await request(hook,{method:'POST',headers,body:{slug:'../invalid',title:'Invalid',content_html:'<p>x</p>'}});assert.equal(r.statusCode,400);
r=await request(hook,{method:'POST',headers,body:{slug:'garage-door-wont-open',title:'Existing',content_html:'<p>x</p>'}});assert.equal(r.statusCode,400);
const body={id:7,slug:'local-integration-check',title:'Safe guide',meta_description:'A guide to your door',hero_image_url:'https://example.com/hero.jpg',publishedAt:'2026-09-30T12:00:00Z',languageCode:'en',content_html:'<h1>Guide</h1><p>Safe content<a href="javascript:alert(1)" onclick="alert(1)">link</a></p><script>alert(1)</script><img src="https://example.com/img.jpg" onerror="alert(1)">',content_markdown:'# Guide',jsonLd:{'@context':'https://schema.org','@type':'Article',headline:'Safe guide'},faqJsonLd:{'@context':'https://schema.org','@type':'FAQPage',mainEntity:[{'@type':'Question',name:'Can a script escape? </script><script>alert(1)</script>',acceptedAnswer:{'@type':'Answer',text:'No'}}]}};
r=await request(hook,{method:'POST',headers,body});assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).link,'https://www.valiantdoor.com/blog/local-integration-check');
r=await request(hook,{method:'POST',headers,body:{...body,id:8,title:'Updated title'}});assert.equal(r.statusCode,200);assert.equal(records.size,1);
const writeCount=writes;r=await request(hook,{method:'POST',headers:{'x-api-key':'local-test-secret'},body:{...body,id:8,title:'Updated title'}});assert.equal(r.statusCode,200);assert.equal(writes,writeCount);
const a=(await p.articles())[0];assert.equal(a.markdown,'# Guide');assert.equal(a.publishedAt,body.publishedAt.replace('00Z','00.000Z'));assert.equal(a.description,body.meta_description);assert.equal(a.heroImage,body.hero_image_url);assert(!/onclick|onerror|javascript:|<script/.test(a.content));
r=await request(blog,{method:'GET',query:{slug:body.slug}});assert.equal(r.statusCode,200);assert(r.body.includes('FAQPage'));assert(r.body.includes('\\u003c/script>'));assert(r.body.includes('<h1>Updated title</h1>'));assert(r.body.includes('September 30, 2026'));assert(r.body.includes('A guide to your door'));
r=await request(hook,{method:'POST',headers,body:{...body,languageCode:'es'}});assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).link,'https://www.valiantdoor.com/blog/es/local-integration-check');assert.equal(records.size,2);
r=await request(blog,{method:'GET',query:{slug:body.slug,language:'es'}});assert.equal(r.statusCode,200);assert(r.body.includes('lang="es"'));
r=await request(blog,{method:'GET',query:{view:'sitemap'}});assert(r.body.includes('/blog/es/local-integration-check'));
// Existing ID-keyed records migrate without changing their URLs or creating duplicate cards.
records.clear();records.set('valiant-blog/articles/legacy.json',JSON.stringify({...a,id:7}));await p.saveArticle(p.normalize({...body,id:9}));assert.equal(records.size,1);assert.equal((await p.articles())[0].id,'9');
console.log('Blog mapping passed: slug upserts, migration, dates, Markdown, schemas, language separation, sanitized HTML and authenticated webhook.');
})().catch(error=>{console.error(error);process.exitCode=1;});
