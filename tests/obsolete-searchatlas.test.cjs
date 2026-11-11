const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {transform}=require('../scripts/remove-obsolete-searchatlas.cjs');
const loader='var script = document.createElement("script");script.setAttribute("nowprocket", "");script.setAttribute("nitro-exclude", "");script.src = "https://dashboard.searchatlas.com/scripts/dynamic_optimization.js";script.dataset.uuid = "d9a71fe5-2db0-4f05-828b-2ae02031da04";script.id = "sa-dynamic-optimization-loader";document.head.appendChild(script);';
const src='data:text/javascript;base64,'+Buffer.from(loader).toString('base64');
test('remove only the exact diagnosed bootstrap, preserving all other scripts and data images',()=>{
  const keep='<h1>Owner copy</h1><script src="https://www.googletagmanager.com/gtag/js?id=AW-17968443655"></script><img src="data:image/png;base64,aGVsbG8="><script id="other" src="data:text/javascript;base64,aGVsbG8="></script><a href="/nextdoor-emergency-repair">Nextdoor</a>';
  const obsolete='<script id="sa-dynamic-optimization" src="'+src+'"></script>';
  assert.equal(transform(keep+obsolete),keep);
  assert.equal(transform(transform(keep+obsolete)),keep);
  const unknown='<script id="sa-dynamic-optimization" src="data:text/javascript;base64,aGVsbG8="></script>';
  assert.equal(transform(unknown),unknown);
});
test('all maintained HTML/templates exclude the diagnosed loader while CSP stays restrictive',()=>{
  const root=path.resolve(__dirname,'..');
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);
  for(const file of [...walk(path.join(root,'public')),path.join(root,'lib/blog-index.html')]) {
    const html=fs.readFileSync(file,'utf8');
    assert.equal(transform(html),html,file);
  }
  const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json')));
  const csp=config.headers.flatMap(h=>h.headers).find(h=>h.key.toLowerCase()==='content-security-policy').value;
  const scripts=csp.split(';').find(d=>d.trim().startsWith('script-src '));
  assert.ok(scripts);assert.doesNotMatch(scripts,/\bdata:|dashboard\.searchatlas\.com/);
});
