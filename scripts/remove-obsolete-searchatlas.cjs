// Remove only the diagnosed, CSP-blocked SearchAtlas data-script bootstrap.
// Never relax CSP or enable an alternate loader to hide the console violation.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const knownSourceHash='9ad38a2a701d999fd2beeeb7e06d9826766531fd6426c9ba303cffb5948b9143';
function transform(html) {
  return html.replace(/<script\b[^>]*\bid=["']sa-dynamic-optimization["'][^>]*>[\s\S]*?<\/script>/gi,tag=>{
    const src=tag.match(/\bsrc=["']([^"']*)["']/i)?.[1];
    return src && crypto.createHash('sha256').update(src).digest('hex')===knownSourceHash ? '' : tag;
  });
}
function walk(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
function run() {
  let changed=0;
  for(const file of [...walk(path.join(root,'public')),path.join(root,'lib/blog-index.html')]) {
    const before=fs.readFileSync(file,'utf8'),after=transform(before);
    if(after!==before){fs.writeFileSync(file,after);changed++;}
  }
  console.log(`Removed diagnosed obsolete SearchAtlas bootstrap from ${changed} pages/templates.`);
}
if(require.main===module)run();
module.exports={transform,knownSourceHash};
