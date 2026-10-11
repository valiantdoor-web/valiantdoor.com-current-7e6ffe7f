const publishing = require('../lib/blog-publishing');
module.exports = async (req,res) => {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex');
  const reply = (status,value) => {res.statusCode=status;res.end(JSON.stringify(value));};
  if(req.method !== 'POST') {res.setHeader('Allow','POST');return reply(405,{success:false,error:'Use POST to publish an article'});}
  if(!process.env.BABYLOVEGROWTH_WEBHOOK_SECRET || !process.env.BLOB_READ_WRITE_TOKEN) return reply(503,{success:false,error:'Publishing is not configured'});
  if(!publishing.authorized(req)) return reply(401,{success:false,error:'Unauthorized'});
  let article;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if(Buffer.byteLength(JSON.stringify(body) || '') > 3_500_000) return reply(413,{success:false,error:'Article is too large'});
    if (body?.type === 'connection_check') {
      try { await publishing.articles(); return reply(200,{success:true,storageReady:true}); }
      catch { return reply(503,{success:false,error:'Article storage is temporarily unavailable'}); }
    }
    article = publishing.normalize(body);
  } catch (error) {return reply(400,{success:false,error:error.message});}
  try {const link = await publishing.saveArticle(article);return reply(200,{success:true,link});}
  catch(error) {
    if(error.status === 409) return reply(409,{success:false,error:error.message});
    console.error('Blog publishing failed',{name:error.name});
    return reply(503,{success:false,error:'Article storage is temporarily unavailable. Please retry.'});
  }
};
