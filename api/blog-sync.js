const {createHash,timingSafeEqual}=require('node:crypto');
const publishing=require('../lib/blog-publishing');
const {syncArticles}=require('../lib/blog-sync');
const same=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex');
 const reply=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return reply(405,{success:false,error:'Method not allowed'});}
 const cronToken=/^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1] || '';
 const cronAuthorized=!!process.env.CRON_SECRET && same(cronToken,process.env.CRON_SECRET);
 if(!cronAuthorized && !(req.method==='POST' && publishing.authorized(req))) return reply(401,{success:false,error:'Unauthorized'});
 if(!process.env.BABYLOVEGROWTH_API_KEY) return reply(503,{success:false,error:'Set BABYLOVEGROWTH_API_KEY in this website project’s Vercel environment settings'});
 if(!process.env.BLOB_READ_WRITE_TOKEN) return reply(503,{success:false,error:'Article storage is not configured'});
 try {return reply(200,await syncArticles());}
 catch(error){console.error('BabyLoveGrowth sync failed',{message:error.message});return reply(502,{success:false,error:error.message});}
};
