const assert = require('node:assert/strict');
const blob = require('@vercel/blob');
const records = new Map();
blob.list = async () => ({blobs:[...records.keys()].map(path=>({url:'https://store.private.blob.vercel-storage.com/'+path})),hasMore:false});
blob.get = async url => ({stream:new Response(records.get(url.split('.com/')[1])).body});
blob.put = async (key,value,options) => {assert.equal(options.access,'private');records.set(key,value);};
process.env.BABYLOVEGROWTH_WEBHOOK_SECRET = 'test-secret-for-local-check';
process.env.BLOB_READ_WRITE_TOKEN = 'mock';
const p = require('../lib/blog-publishing');
const hook = require('../api/blog-webhook');
const blog = require('../api/blog');
function res() {return {headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=v}};}
async function request(handler,req) {const r=res();await handler(req,r);return r;}
(async()=>{
let r = await request(hook,{method:'POST',headers:{},body:{}});assert.equal(r.statusCode,401);
r = await request(hook,{method:'GET',headers:{}});assert.equal(r.statusCode,405);
const headers={authorization:'Bearer test-secret-for-local-check'};
r = await request(hook,{method:'POST',headers,body:{id:1,slug:'../bad',title:'Bad',content_html:'<p>x</p>'}});assert.equal(r.statusCode,400);
r = await request(hook,{method:'POST',headers,body:{id:1,slug:'garage-door-wont-open',title:'Collision',content_html:'<p>x</p>'}});assert.equal(r.statusCode,400);
const body={id:7001,slug:'local-integration-check',title:'Garage Door Guide',metaDescription:'Safe guide',content_html:'<h1>Guide</h1><p>Safe content <a href="javascript:alert(1)" onclick="alert(1)">link</a></p><script>alert(1)</script><img src="https://example.com/photo.jpg" onerror="alert(1)">',heroImageUrl:'https://example.com/hero.jpg',createdAt:'2026-10-11T12:00:00Z'};
r=await request(hook,{method:'POST',headers,body});assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).link,'https://www.valiantdoor.com/blog/local-integration-check');
r=await request(hook,{method:'POST',headers:{'x-api-key':'test-secret-for-local-check'},body:{...body,title:'Updated guide'}});assert.equal(r.statusCode,200);assert.equal(records.size,1);
r=await request(hook,{method:'POST',headers,body:{...body,id:7002}});assert.equal(r.statusCode,409);
r=await request(hook,{method:'POST',headers,body:{...body,slug:'changed-slug'}});assert.equal(r.statusCode,409);
const values=await p.articles();assert(!values[0].content.includes('onclick'));assert(!values[0].content.includes('javascript:'));assert(!values[0].content.includes('onerror'));assert(!values[0].content.includes('<script'));
r=await request(blog,{method:'GET',query:{}});assert.equal(r.statusCode,200);assert(r.body.includes('latest-blog-articles'));assert(r.body.includes('/blog/local-integration-check'));assert(r.body.includes('/blog/garage-door-wont-open'));
r=await request(blog,{method:'GET',query:{slug:body.slug}});assert.equal(r.statusCode,200);assert(r.body.includes('<h1>Updated guide</h1>'));assert(r.body.includes('BlogPosting'));assert(r.body.includes('https://www.valiantdoor.com/blog/local-integration-check'));assert(r.body.includes('published-blog-content'));assert(!r.body.includes('javascript:alert'));
r=await request(blog,{method:'GET',query:{view:'sitemap'}});assert.equal(r.statusCode,200);assert(r.body.includes('/blog/local-integration-check'));assert(r.body.includes('/blog/garage-door-wont-open'));
r=await request(blog,{method:'GET',query:{slug:'unknown'}});assert.equal(r.statusCode,404);
console.log('Passed: authentication, payload validation, existing slug protection, private storage, retry updates, conflicts, HTML sanitization, server-rendered index/article, sitemap, and 404');
})();
