const assert=require('node:assert/strict');
const {syncArticles,createApiClient}=require('../lib/blog-sync');
(async()=>{
let clock=0;let tries=0;const calls=[];
const client=createApiClient({key:'local-mock-api-key',now:()=>clock,sleepFn:async ms=>{clock+=ms;},fetchFn:async(url,opts)=>{assert.equal(opts.headers['X-API-Key'],'local-mock-api-key');assert.equal(opts.headers['Content-Type'],'application/json');assert(opts.headers['User-Agent'].includes('Valiant'));calls.push(clock);tries++;return tries===1?new Response('{}',{status:429,headers:{'Retry-After':'3'}}):Response.json([]);}});
await client('/v1/articles?limit=50&offset=0');await client('/v1/articles/12');assert(calls[1]-calls[0]>=3000);assert(calls[2]-calls[1]>=2100);
const urls=[];const saved=[];let state={offset:0};
const options={key:'mock',loadArticles:async()=>[],loadState:async()=>state,saveState:async s=>{state=s;},save:async a=>saved.push(a),normalize:a=>a,api:async pathname=>{urls.push(pathname);if(pathname.includes('?')){const offset=Number(new URL('https://example.test'+pathname).searchParams.get('offset'));return Array.from({length:offset===0?50:3},(_,i)=>({id:offset+i,slug:'guide-'+(offset+i),published:false}));}const id=Number(pathname.split('/').pop());return {id,title:'Guide '+id,content_html:'<p>Full content</p>'};}};
const result=await syncArticles(options);assert.equal(result.complete,true);assert.equal(saved.length,53);assert.equal(state.offset,0);assert(urls.includes('/v1/articles?limit=50&offset=50'));assert.equal(urls.filter(u=>!u.includes('?')).length,53);assert(saved.every(a=>a.content_html));
// A large import resumes at the last durably stored article, without a timeout.
clock=0;state={offset:0};saved.length=0;
const paginatedApi=options.api;options.now=()=>clock;options.budgetMs=5;options.api=async path=>{clock++;return paginatedApi(path);};
const first=await syncArticles(options);assert.equal(first.complete,false);const resume=state.offset;assert(resume>0);clock=0;urls.length=0;
await syncArticles(options);assert(urls[0].endsWith('offset='+resume));
await assert.rejects(()=>syncArticles({key:'',loadArticles:async()=>[]}),/BABYLOVEGROWTH_API_KEY/);
console.log('API sync passed: required headers, serial rate limits, retries, full article fetches, pagination, no published filter and resumable checkpoints.');
})().catch(error=>{console.error(error);process.exitCode=1;});
