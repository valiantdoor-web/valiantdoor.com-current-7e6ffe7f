const blob = require('@vercel/blob');
const publishing = require('./blog-publishing');
const BASE = 'https://api.babylovegrowth.ai/api/integrations';
const STATE = 'valiant-blog/sync-state.json';
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function readState() {
  const result = await blob.get(STATE,{access:'private',useCache:false});
  return result ? JSON.parse(await new Response(result.stream).text()) : {offset:0};
}
async function writeState(value) {
  await blob.put(STATE,JSON.stringify(value),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:60});
}
function createApiClient({key,fetchFn=fetch,sleepFn=sleep,now=Date.now}) {
  let nextRequestAt = 0;
  return async pathname => {
    for(let attempt=0;attempt<4;attempt++) {
      const wait = nextRequestAt-now(); if(wait>0) await sleepFn(wait);
      const response = await fetchFn(BASE+pathname,{headers:{'X-API-Key':key,'Content-Type':'application/json','User-Agent':'ValiantGarageDoorBlogSync/1.0 (+https://www.valiantdoor.com)'},signal:AbortSignal.timeout(20000)});
      nextRequestAt=now()+2100;
      if(response.status===429 || response.status>=500) {
        if(attempt===3) throw new Error('BabyLoveGrowth API temporarily unavailable (HTTP '+response.status+')');
        const retryAfter=response.headers.get('retry-after');
        const seconds=Number(retryAfter);
        const retryDate=Date.parse(retryAfter || '');
        const retryDelay=retryAfter ? (Number.isFinite(seconds)?seconds*1000:(Number.isFinite(retryDate)?retryDate-now():0)) : 0;
        await sleepFn(Math.max(2100*2**attempt,retryDelay));continue;
      }
      if(!response.ok) throw new Error('BabyLoveGrowth API rejected the request (HTTP '+response.status+')');
      return response.json();
    }
  };
}
async function syncArticles(options={}) {
  const key=options.key || process.env.BABYLOVEGROWTH_API_KEY;
  if(!key) throw new Error('BABYLOVEGROWTH_API_KEY is not configured');
  const now=options.now || Date.now;
  const started=now();
  const budget=options.budgetMs ?? 210000;
  const api=options.api || createApiClient({...options,key});
  const loadState=options.loadState || readState;
  const saveState=options.saveState || writeState;
  const save=options.save || publishing.saveArticle;
  const normalize=options.normalize || publishing.normalize;
  const stored=await (options.loadArticles || publishing.articles)();
  const state=await loadState();
  let offset=Number.isSafeInteger(state.offset)&&state.offset>=0?state.offset:0;
  let synced=0;const skipped=[];
  const checkpoint=async complete=>saveState({offset:complete?0:offset,complete,synced,skipped,lastRun:new Date(now()).toISOString(),...(complete?{lastCompleted:new Date(now()).toISOString()}:{})});
  while(now()-started<budget) {
    const list=await api('/v1/articles?limit=50&offset='+offset);
    if(!Array.isArray(list)) throw new Error('BabyLoveGrowth list response must be an array');
    for(const meta of list) {
      if(now()-started>=budget) {await checkpoint(false);return {success:true,complete:false,synced,nextOffset:offset,skipped};}
      if(meta.id===undefined || meta.id===null) throw new Error('An article summary is missing its id');
      const full=await api('/v1/articles/'+encodeURIComponent(String(meta.id)));
      let article;
      try {article=normalize({...meta,...full});}
      catch(error) {skipped.push({slug:String(meta.slug || ''),reason:error.message});offset++;continue;}
      await save(article,stored);synced++;offset++;
      await checkpoint(false);
    }
    if(list.length<50) {await checkpoint(true);return {success:true,complete:true,synced,nextOffset:0,skipped};}
  }
  await checkpoint(false);return {success:true,complete:false,synced,nextOffset:offset,skipped};
}
module.exports={syncArticles,createApiClient};
