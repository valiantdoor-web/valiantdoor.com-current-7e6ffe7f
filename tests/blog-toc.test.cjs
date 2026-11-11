const {test}=require('node:test');
const assert=require('node:assert/strict');
const cheerio=require('cheerio');
const {repairArticleToc}=require('../lib/blog-toc');
const publishing=require('../lib/blog-publishing');
const fixtures=require('./fixtures/blog-toc-20261110.json');
const load=html=>cheerio.load(html,null,false);
const text=html=>load(html).text();

test('all147 audited TOC entries:146 real targets, one honest non-link Sources label',()=>{
  assert.equal(fixtures.length,12);
  assert.equal(fixtures.reduce((n,p)=>n+p.toc.length,0),147);
  let repaired=0,unavailable=0;
  for(const article of fixtures){
    const before=load(article.content),afterHtml=repairArticleToc(article.content,article.url),after=load(afterHtml);
    assert.equal(after.text(),before.text(),article.url+' visible words must not change');
    assert.deepEqual(after('img').map((_,e)=>({...e.attribs})).get(),before('img').map((_,e)=>({...e.attribs})).get(),article.url+' media unchanged');
    assert.equal(repairArticleToc(afterHtml,article.url),afterHtml,article.url+' idempotent');
    const allIds=after('[id]').map((_,e)=>after(e).attr('id')).get();
    assert.equal(new Set(allIds).size,allIds.length,article.url+' unique target IDs');
    for(const entry of article.toc){
      const links=after('a[href]').filter((_,el)=>after(el).text()===entry.text);
      if(article.slug==='garage-door-slammed-shut'&&entry.text==='Sources'){
        assert.equal(links.length,0);assert.equal(after('span').filter((_,el)=>after(el).text()==='Sources').length,1);unavailable++;continue;
      }
      assert.equal(links.length,1,article.url+' '+entry.text);
      const href=new URL(links.attr('href'));
      assert.equal(href.origin+href.pathname,article.url,article.url+' must not navigate to home');
      const id=decodeURIComponent(href.hash.slice(1));
      assert.equal(after('[id]').filter((_,el)=>after(el).attr('id')===id).length,1,article.url+' existing target '+id);
      assert.match(id,/^blog-section-[a-z0-9-]+$/);
      assert.equal(after('[id]').filter((_,el)=>after(el).attr('id')===id).attr('tabindex'),'-1');
      repaired++;
    }
    // All non-TOC destinations are preserved, including deliberate Home links.
    const oldLinks=before('a[href]').filter((_,el)=>!article.toc.some(t=>t.href===before(el).attr('href'))).map((_,el)=>before(el).attr('href')).get();
    const newLinks=after('a[href]').filter((_,el)=>!after(el).attr('href').startsWith(article.url+'#')).map((_,el)=>after(el).attr('href')).get();
    assert.deepEqual(newLinks,oldLinks);
  }
  assert.equal(repaired,146);assert.equal(unavailable,1);
});

test('new article sanitization keeps safe heading IDs and article-relative URLs without reopening XSS',()=>{
  const article=publishing.normalize({id:'safe-toc',slug:'safe-toc',title:'A safe TOC',languageCode:'es',publishedAt:'2026-11-01T00:00:00Z',content_html:'<h1 id="intro">Intro</h1><p><a href="#intro">Intro</a><a href="javascript:alert(1)" onclick="alert(1)">Bad</a></p><h2 id="bad id">Unsafe</h2><div id="globalMainNav">No imported chrome ID</div><img src="https://example.com/a.jpg" onerror="alert(1)"><script>alert(1)</script>'});
  const clean=load(article.content);
  assert.equal(clean('h2').first().attr('id'),'intro');
  assert.equal(clean('h2').last().attr('id'),undefined);
  assert.equal(clean('div').attr('id'),undefined);
  assert.equal(clean('a').first().attr('href'),'https://www.valiantdoor.com/blog/es/safe-toc#intro');
  assert.doesNotMatch(article.content,/javascript:|onclick|onerror|<script/i);
  const rendered=cheerio.load(publishing.renderArticle(article));
  assert.equal(rendered('link[rel=canonical]').attr('href'),'https://www.valiantdoor.com/blog/es/safe-toc');
  assert.equal(rendered('main > article > .geo-hero h1').text(),'A safe TOC');
  const link=rendered('.published-blog-content a').first();
  assert.equal(link.attr('href'),'https://www.valiantdoor.com/blog/es/safe-toc#blog-section-intro');
  assert.equal(rendered('#blog-section-intro').length,1);
  const relative=publishing.normalize({id:'relative-links',slug:'relative-links',title:'Keep existing relative paths',content_html:'<h2 id="intro">Intro</h2><p><a href="#intro">Intro</a><a href="services">Services</a></p>'});
  assert.equal(load(relative.content)('a').last().attr('href'),'https://www.valiantdoor.com/services','unrelated relative URL normalization stays unchanged');
});

test('IDs are namespaced/deduplicated, ordinary homepage links and external fragments stay unchanged',()=>{
  const html='<h2>Table of Contents</h2><ul><li><a href="#same">Second</a></li></ul><h2 id="same">First</h2><h2 id="same">Second</h2><h3 id="bad id">Other</h3><p><a href="https://www.valiantdoor.com/#contact">Home contact</a><a href="https://example.com/#same">External</a></p>';
  const out=repairArticleToc(html,'https://www.valiantdoor.com/blog/test'),$=load(out);
  assert.equal($('a').first().attr('href'),'https://www.valiantdoor.com/blog/test#blog-section-same-2');
  assert.equal($('a').eq(1).attr('href'),'https://www.valiantdoor.com/#contact');
  assert.equal($('a').eq(2).attr('href'),'https://example.com/#same');
  assert.equal($('[id="bad id"]').length,0);
  assert.equal(new Set($('[id]').map((_,e)=>$(e).attr('id')).get()).size,$('[id]').length);
  assert.equal(text(out),text(html));
});

test('unresolvable TOC entries remain visible without invented sections or unsafe new navigation',()=>{
  const html='<h2>Table of Contents</h2><ul><li><a href="https://www.valiantdoor.com/#sources">Sources</a></li><li><a href="#missing">Missing</a></li></ul><h2>Actual content</h2><p>Keep me.</p>';
  const out=repairArticleToc(html,'https://www.valiantdoor.com/blog/test'),$=load(out);
  assert.equal($('a').length,0);assert.equal($('span').length,2);assert.equal(text(out),text(html));
  assert.equal($('h2').length,2);
});

test('rendering all12 legacy records fixes TOC links without persistent blob writes or policy changes',()=>{
  for(const fixture of fixtures){
    const article={...fixture,id:fixture.slug,description:'Existing article description',language:'en',publishedAt:'2026-10-18T12:00:00Z',updatedAt:'2026-10-18T12:00:00Z',heroImage:'',heroAlt:''};
    const $=cheerio.load(publishing.renderArticle(article));
    assert.equal($('link[rel=canonical]').attr('href'),fixture.url);
    assert.equal($('.geo-hero h1').text(),fixture.title);
    assert.equal($('.published-blog-content').text(),load(fixture.content).text());
    assert.equal($('.published-blog-content a[href^="https://www.valiantdoor.com/#"]').length,0,fixture.url);
    assert.equal($('h1').length,1);
  }
});
