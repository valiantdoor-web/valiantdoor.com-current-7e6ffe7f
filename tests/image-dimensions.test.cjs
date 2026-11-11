const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const cheerio = require('cheerio');
const {addMeasuredImageDimensions} = require('../lib/image-dimensions');
const manifest = require('../data/image-dimensions-20261110.json');
const fixtures = require('./fixtures/image-dimensions-20261110.json');
const measuredUrl = Object.keys(manifest.images)[0];
const attrs = html => cheerio.load(html, null, false)('img')[0].attribs;
const omitDimensions = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['width','height'].includes(key)));

test('61 measured images retain byte-hash and EXIF-aware intrinsic-size provenance', () => {
  assert.equal(Object.keys(manifest.images).length,61);
  assert.equal(manifest.verification.auditedRealImageInstances,98);
  assert.equal(manifest.verification.auditedPages,29);
  for (const [url,m] of Object.entries(manifest.images)) {
    assert.equal(new URL(url).protocol,'https:');
    assert.match(m.sha256,/^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(m.width) && m.width > 0 && Number.isInteger(m.height) && m.height > 0);
    assert.ok(m.bytes > 0); assert.equal(m.status,200); assert.match(m.contentType,/^image\//);
    const swapped=[5,6,7,8].includes(m.orientationUsed);
    assert.equal(m.width,swapped?m.encodedHeight:m.encodedWidth);
    assert.equal(m.height,swapped?m.encodedWidth:m.encodedHeight);
  }
});

test('all 98 audited real image instances gain measured dimensions without changing other attributes', () => {
  assert.equal(fixtures.length,98);
  assert.equal(new Set(fixtures.map(x=>x.page)).size,29);
  for (const fixture of fixtures) {
    const before=attrs(fixture.tag), afterHtml=addMeasuredImageDimensions(fixture.tag,fixture.page), after=attrs(afterHtml);
    const u=new URL(before.src,fixture.page);u.hash='';const size=manifest.images[u.href];
    assert.ok(size,fixture.src);
    assert.equal(after.width,String(size.width)); assert.equal(after.height,String(size.height));
    assert.deepEqual(omitDimensions(after),omitDimensions(before),fixture.page);
    assert.equal(addMeasuredImageDimensions(afterHtml,fixture.page),afterHtml,'idempotent '+fixture.page);
  }
});

test('raw document bytes outside dimension attributes are preserved, including quoted greater-than signs', () => {
  const before=`<style>.x{height:auto}</style><h2>Owner copy stays</h2><img data-owner='keep' src="${measuredUrl}" alt="A > B; width=unchanged" width="1200" style='width:100%;height:auto' /><script type="application/ld+json">{"name":"Keep schema"}</script>`;
  const after=addMeasuredImageDimensions(before);
  const strip=html=>html.replace(/<img\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi,tag=>tag.replace(/\s+(width|height)=(?:"[^"]*"|'[^']*')/gi,''));
  assert.equal(strip(after),strip(before));
  assert.match(after,/alt="A > B; width=unchanged"/);
});

test('complete owner dimension pairs, empty lightbox, unknown and unsafe sources remain untouched', () => {
  for(const html of [
    `<img src="${measuredUrl}" width="333" height="222" alt="Existing complete pair">`,
    '<img id="lightbox-image" src="" alt="">',
    '<img src="https://unverified.example/image.jpg" alt="Unknown">',
    '<img src="data:image/png;base64,aGVsbG8=" alt="">',
    '<img src="https://user:password@www.valiantdoor.com/image.webp" alt="Unsafe source">'
  ]) assert.equal(addMeasuredImageDimensions(html),html);
});

test('maintained static HTML/templates are stable after dimension-only refresh', () => {
  const root=path.resolve(__dirname,'..');
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);
  for(const file of [...walk(path.join(root,'public')),path.join(root,'lib/blog-index.html')]) {
    const html=fs.readFileSync(file,'utf8');assert.equal(addMeasuredImageDimensions(html),html,file);
  }
});

test('dynamic article hero/content and index cards use measured aspect ratios', () => {
  const {renderArticle,renderIndex}=require('../lib/blog-publishing');
  const remote=fixtures.find(f=>f.src.includes('media.babylovegrowth.ai')).src;
  const a={slug:'measured-image-test',title:'Measured image test',description:'Preserved test content',language:'en',heroImage:remote,heroAlt:'Existing published image',publishedAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',content:`<p>Original text</p><img src="${remote}" alt="Existing published image">`};
  for(const html of [renderArticle(a,[a]),renderIndex([a])]) {
    const $=cheerio.load(html);const images=$('img').toArray().filter(e=>$(e).attr('src')===remote);
    assert.ok(images.length);
    for(const image of images) {
      assert.equal($(image).attr('width'),String(manifest.images[remote].width));
      assert.equal($(image).attr('height'),String(manifest.images[remote].height));
    }
  }
});

test('approved editorial snapshot changes are exactly the known bootstrap ID removal and measured image dimensions', () => {
  const base='38b690cbc24cfe05e6ee99026d95a40688e9e9d4';
  const {hash,mainDigest,protectedContent}=require('./helpers/editorial-copy.cjs');
  const {transform:removeSearchAtlas}=require('../scripts/remove-obsolete-searchatlas.cjs');
  const snapshot=require('../data/editorial-copy-20261025.json');
  const gitRead=file=>execFileSync('git',['show',base+':'+file],{encoding:'utf8'});
  const originalSnapshot=JSON.parse(gitRead('data/editorial-copy-20261025.json'));
  let updated=0,withDimensions=0;
  assert.equal(snapshot.baseline,originalSnapshot.baseline);
  for(const [route,entry]of Object.entries(snapshot.pages)) {
    const file='public/'+route+'/index.html',original=gitRead(file);
    const withoutBootstrap=removeSearchAtlas(original),expected=addMeasuredImageDimensions(withoutBootstrap);
    const candidate=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    const before=protectedContent(original),after=protectedContent(expected);
    // Only the fingerprinted obsolete script's ID may disappear. Do not
    // suppress all IDs/scripts or loosen the shared editorial contract helper.
    assert.deepEqual(after.ids,withoutBootstrap===original?before.ids:before.ids.filter(id=>id!=='sa-dynamic-optimization'));
    const stripAllowed=value=>{
      value=structuredClone(value);
      value.ids=value.ids.filter(id=>id!=='sa-dynamic-optimization');
      for(const [tag,attrs]of value.media)if(tag==='img'){delete attrs.width;delete attrs.height;}
      return value;
    };
    assert.deepEqual(stripAllowed(after),stripAllowed(before),route+' all other protected contracts');
    assert.deepEqual(protectedContent(candidate),after,route+' candidate has only exact approved transforms');
    assert.equal(mainDigest(candidate),originalSnapshot.pages[route].mainDigest,route+' original main copy');
    assert.deepEqual({...entry,protectedDigest:originalSnapshot.pages[route].protectedDigest},originalSnapshot.pages[route]);
    assert.equal(entry.protectedDigest,hash(after));
    if(entry.protectedDigest!==originalSnapshot.pages[route].protectedDigest)updated++;
    if(addMeasuredImageDimensions(original)!==original)withDimensions++;
  }
  assert.equal(updated,50); assert.equal(withDimensions,10);
});
