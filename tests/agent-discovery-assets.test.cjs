const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');

test('WebMCP immutable asset version identifies the actual served bundle',()=>{
  const versions=require('../data/site-asset-versions.json');
  const bytes=fs.readFileSync(path.join(root,'public/js/webmcp.min.js'),'utf8').trimEnd();
  const version='/js/webmcp.min.js?v='+crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12);
  assert.equal(versions['/js/webmcp.js'],version);
  assert.equal(versions['/js/webmcp.min.js'],version);
});

test('build refresh updates every WebMCP reference without changing page content',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'valiant-agent-assets-'));
  try {
    for(const dir of ['scripts','data','public/nested','lib'])fs.mkdirSync(path.join(tmp,dir),{recursive:true});
    fs.copyFileSync(path.join(root,'scripts/refresh-tracking-assets.cjs'),path.join(tmp,'scripts/refresh-tracking-assets.cjs'));
    const versions={'/js/webmcp.js':'/js/webmcp.min.js?v=current','/js/webmcp.min.js':'/js/webmcp.min.js?v=current'};
    fs.writeFileSync(path.join(tmp,'data/site-asset-versions.json'),JSON.stringify(versions));
    const before='<h1>Keep owner content</h1><script src="/js/webmcp.min.js?v=old" defer></script><script src="/js/webmcp.js"></script><a href="/nextdoor-emergency-repair">Nextdoor</a><script src="/js/unrelated.js?v=keep"></script>';
    const files=['public/index.html','public/nested/index.html','lib/blog-index.html'];
    for(const file of files)fs.writeFileSync(path.join(tmp,file),before);
    execFileSync(process.execPath,[path.join(tmp,'scripts/refresh-tracking-assets.cjs')]);
    const expected=before.replace('/js/webmcp.min.js?v=old','/js/webmcp.min.js?v=current').replace('/js/webmcp.js','/js/webmcp.min.js?v=current');
    for(const file of files)assert.equal(fs.readFileSync(path.join(tmp,file),'utf8'),expected);
    execFileSync(process.execPath,[path.join(tmp,'scripts/refresh-tracking-assets.cjs')]);
    for(const file of files)assert.equal(fs.readFileSync(path.join(tmp,file),'utf8'),expected);
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
