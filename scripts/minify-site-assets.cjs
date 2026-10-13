#!/usr/bin/env node
// Minify only referenced first-party JS/CSS. Source files stay readable; URL
// versions change with the content so one-year immutable caching remains safe.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {minify}=require('terser');
const CleanCSS=require('clean-css');
const ROOT=path.resolve(__dirname,'..');
const PUBLIC=path.join(ROOT,'public');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);
(async()=>{
 const files=[...walk(PUBLIC).filter(file=>!/[\\/](?:listings-admin|authority-dashboard|settings|address-selection-hidden)[\\/]/.test(file)),path.join(ROOT,'lib/blog-index.html')];
 const sources=new Set(['/js/global-chrome.js','/css/global-chrome.css','/css/credentials.css']);
 const ref=/\/(?:(?:js|css)\/[a-z0-9_.-]+|assets\/moenave-luxury\/scene(?:\.min)?)\.(?:js|css)(?:\?[^"'\s<>]*)?/gi;
 for(const file of files)for(const match of fs.readFileSync(file,'utf8').matchAll(ref)){
  const url=match[0].split('?')[0];
  const sourceUrl=url.replace(/\.min\.(js|css)$/,'.$1');
  if(sourceUrl==='/js/main.js')continue;
  if(fs.existsSync(path.join(PUBLIC,sourceUrl)))sources.add(sourceUrl);
 }
 // main.min.js is generated from the corrected maintained source.
 const main=await minify(fs.readFileSync(path.join(ROOT,'src/js/main.js'),'utf8'),{compress:true,mangle:true,format:{comments:false}});
 fs.writeFileSync(path.join(PUBLIC,'js/main.min.js'),main.code+'\n');
 const mainHash=crypto.createHash('sha256').update(main.code).digest('hex').slice(0,12);
 const urls=new Map([['/js/main.min.js','/js/main.min.js?v='+mainHash]]);
 const report=[];
 for(const sourceUrl of [...sources].sort()){
  const source=fs.readFileSync(path.join(PUBLIC,sourceUrl),'utf8');
  let output;
  if(sourceUrl.endsWith('.js'))output=(await minify(source,{compress:true,mangle:true,format:{comments:false}})).code;
  else{const result=new CleanCSS({level:1,rebase:false}).minify(source);if(result.errors.length)throw new Error(result.errors.join(';'));output=result.styles;}
  const dest=sourceUrl.replace(/\.(js|css)$/,'.min.$1');
  const hash=crypto.createHash('sha256').update(output).digest('hex').slice(0,12);
  fs.writeFileSync(path.join(PUBLIC,dest),output+'\n');
  urls.set(sourceUrl,dest+'?v='+hash);urls.set(dest,dest+'?v='+hash);
  report.push({source:sourceUrl,target:dest,sourceBytes:Buffer.byteLength(source),minifiedBytes:Buffer.byteLength(output)+1});
 }
 for(const file of files){
  const before=fs.readFileSync(file,'utf8');
  const after=before.replace(ref,url=>urls.get(url.split('?')[0])||url);
  if(after!==before)fs.writeFileSync(file,after);
 }
 fs.writeFileSync(path.join(ROOT,'data/site-asset-versions.json'),JSON.stringify(Object.fromEntries(urls),null,2)+'\n');
 console.log(JSON.stringify({files:report.length,sourceBytes:report.reduce((n,r)=>n+r.sourceBytes,0),minifiedBytes:report.reduce((n,r)=>n+r.minifiedBytes,0),assets:report},null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
