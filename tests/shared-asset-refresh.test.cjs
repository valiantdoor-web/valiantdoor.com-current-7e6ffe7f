const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const CleanCSS=require('clean-css');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const versions=require('../data/site-asset-versions.json');
for(const type of ['js','css'])test(`shared ${type} immutable URL matches actual bundle bytes`,()=>{
  const file=`/${type}/global-chrome.min.${type}`;
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'public',file),'utf8').trimEnd()).digest('hex').slice(0,12);
  assert.equal(versions[file],`${file}?v=${hash}`);
  assert.equal(versions[`/${type}/global-chrome.${type}`],versions[file]);
});
test('every maintained HTML/template uses current shared JS and CSS immutable URLs',()=>{
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);
  const counts={js:0,css:0};
  for(const file of [...walk(path.join(root,'public')),path.join(root,'lib/blog-index.html')]){
    for(const [url] of fs.readFileSync(file,'utf8').matchAll(/\/(?:js|css)\/global-chrome(?:\.min)?\.(?:js|css)(?:\?[^"'\s<>]*)?/g)){
      assert.equal(url,versions[url.split('?')[0]],file);
      counts[url.startsWith('/js/')?'js':'css']++;
    }
  }
  // Six custom no-chrome pages intentionally omit the broad shared stylesheet;
  // their launcher-only stylesheet fallback is covered by chat-on-demand tests.
  assert.deepEqual(counts,{js:585,css:579});
});
test('shared CSS is reproducibly compiled and original design source remains byte-preserved',()=>{
  const source=fs.readFileSync(path.join(root,'public/css/global-chrome.css'),'utf8');
  const original=execFileSync('git',['show','38b690cbc24cfe05e6ee99026d95a40688e9e9d4:public/css/global-chrome.css'],{cwd:root,encoding:'utf8'});
  assert.ok(source.startsWith(original),'existing design rules must remain unchanged');
  const result=new CleanCSS({level:1,rebase:false}).minify(source);
  assert.deepEqual(result.errors,[]);
  assert.equal(fs.readFileSync(path.join(root,'public/css/global-chrome.min.css'),'utf8').trimEnd(),result.styles);
});
