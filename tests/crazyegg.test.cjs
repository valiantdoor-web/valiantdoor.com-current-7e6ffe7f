const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {script,routes}=require('../data/crazyegg-pages.json');
const root=path.resolve(__dirname,'..');
const tag=`<script type="text/javascript" src="${script}" async="async"></script>`;
test('exactly one async account script in head on all 44 intended pages',()=>{
 assert.equal(new Set(routes).size,44);
 for(const route of routes){
  const file=path.posix.join('public',route.slice(1),'index.html');
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.equal(html.split(script).length-1,1,file);
  assert.ok(html.indexOf(tag)<html.indexOf('</head>'),file);
  // Installing analytics must not change page copy, navigation, metadata or layout.
  const base=execFileSync('git',['show',`d2b6fb0dcf0be6ccbe54d21bf9d73808105f3fde:${file}`],{cwd:root,encoding:'utf8'});
  const committed=execFileSync('git',['show',`HEAD:${file}`],{cwd:root,encoding:'utf8'});
  assert.equal(committed.replace(tag+'\n',''),base,file);
 }
});
test('no tracker on pages outside the explicit manifest',()=>{
 const allowed=new Set(routes.map(r=>path.join(root,'public',r.slice(1),'index.html')));
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const f=path.join(dir,e.name);if(e.isDirectory())walk(f);
  else if(f.endsWith('.html')&&!allowed.has(f))assert.ok(!fs.readFileSync(f,'utf8').includes(script),f);
 }} walk(path.join(root,'public'));
});
test('CSP permits Crazy Egg without removing existing restrictions',()=>{
 const current=JSON.parse(fs.readFileSync(path.join(root,'vercel.json')));
 const original=JSON.parse(execFileSync('git',['show','d2b6fb0dcf0be6ccbe54d21bf9d73808105f3fde:vercel.json'],{cwd:root,encoding:'utf8'}));
 const header=current.headers.flatMap(r=>r.headers).find(h=>h.key==='Content-Security-Policy');
 for(const directive of ['script-src','connect-src','style-src','frame-src']){
  assert.ok(header.value.split(';').find(d=>d.trim().startsWith(directive+' ')).includes('https://*.crazyegg.com'));
 }
 header.value=header.value.replaceAll(' https://*.crazyegg.com','');
 assert.deepEqual(current,original);
});
