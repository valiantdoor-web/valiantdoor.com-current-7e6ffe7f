const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {JSDOM, VirtualConsole} = require('jsdom');
const root = path.resolve(__dirname, '..');
// CI checks the actual served bundle too. Source-only is an explicit local
// development option while the parent regenerates the shared minified file.
const files = process.env.CHAT_TEST_SOURCE_ONLY === '1' ? ['global-chrome.js'] : ['global-chrome.js','global-chrome.min.js'];
const source = file => fs.readFileSync(path.join(root,'public/js',file),'utf8');
const provider = 'script[src="https://chat.housecallpro.com/proChat.js"]';
function setup(file, pathname='/services', before=()=>{}) {
  const dom=new JSDOM('<html><head></head><body data-chrome="off"><main><h1>Preserved owner content</h1></main></body></html>',{url:'https://www.valiantdoor.com'+pathname,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
  const w=dom.window;
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.IntersectionObserver=class {observe(){} disconnect(){}};
  const requests=[];
  w.fetch=async(url,options)=>{requests.push({url:String(url),method:options?.method||'GET'});return {ok:true,json:async()=>({})};};
  before(w);
  w.eval(source(file));
  return {dom,w,requests};
}
function assertOfficial(script) {
  assert.ok(script);assert.equal(script.id,'housecall-pro-chat-bubble');
  assert.equal(script.src,'https://chat.housecallpro.com/proChat.js');
  assert.equal(script.dataset.color,'#bcaa34');
  assert.equal(script.dataset.organization,'544de216-f35f-4c0b-835a-7950591bbd80');
  assert.equal(script.async,true);
}

for(const file of files) {
  test(file+': no provider app or iframe before explicit chat intent; native accessible controls and SMS remain',()=>{
    const {dom,w,requests}=setup(file);
    try {
      const button=w.document.getElementById('valiant-chat-launcher');assert.ok(button);
      assert.equal(button.tagName,'BUTTON');assert.equal(button.type,'button');
      assert.equal(button.hasAttribute('aria-hidden'),false);assert.equal(button.hasAttribute('tabindex'),false);
      assert.match(button.textContent,/Chat with Valiant/);assert.match(button.textContent,/Click to load/);
      assert.equal(w.document.querySelectorAll(provider).length,0);
      assert.equal(w.document.getElementById('proChatIframe'),null);
      assert.equal(w.document.querySelector('.global-chat-facade>a').href,'sms:+19254094974');
      assert.ok(requests.every(r=>r.method==='GET'&&!/housecallpro/.test(r.url)));
      assert.equal(w.document.querySelector('h1').textContent,'Preserved owner content');
    } finally {dom.window.close();}
  });

  test(file+': first click loads exact official widget once, repeated click/shared script cannot duplicate',()=>{
    const {dom,w}=setup(file);
    try {
      const button=w.document.getElementById('valiant-chat-launcher');button.click();button.click();
      assert.equal(w.document.querySelectorAll(provider).length,1);assertOfficial(w.document.querySelector(provider));
      assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-busy'),'true');
      assert.match(button.textContent,/Loading secure chat/);
      assert.ok(w.document.querySelector('.global-chat-facade>a'));
      w.eval(source(file));assert.equal(w.document.querySelectorAll('.global-chat-facade').length,1);
      assert.equal(w.document.querySelectorAll(provider).length,1);
    } finally {dom.window.close();}
  });

  test(file+': provider script failure restores retry without sending a message or losing SMS fallback',()=>{
    const {dom,w,requests}=setup(file);
    try {
      const button=w.document.getElementById('valiant-chat-launcher');button.click();
      w.document.querySelector(provider).dispatchEvent(new w.Event('error'));
      assert.equal(w.document.querySelectorAll(provider).length,0);
      assert.equal(button.disabled,false);assert.equal(button.hasAttribute('aria-busy'),false);
      assert.match(button.textContent,/Retry chat/);
      assert.equal(w.document.querySelector('.global-chat-facade>a').href,'sms:+19254094974');
      button.click();assert.equal(w.document.querySelectorAll(provider).length,1);assertOfficial(w.document.querySelector(provider));
      assert.ok(requests.every(r=>r.method==='GET'&&!/housecallpro/.test(r.url)));
    } finally {dom.window.close();}
  });

  test(file+': provider frame is named and facade hands over only on frame load, including delayed frame creation',async()=>{
    for(const late of [false,true]) {
      const {dom,w}=setup(file);
      try {
        const button=w.document.getElementById('valiant-chat-launcher');button.click();
        const script=w.document.querySelector(provider);
        if(late)script.dispatchEvent(new w.Event('load'));
        const frame=w.document.createElement('iframe');frame.id='proChatIframe';w.document.body.appendChild(frame);
        if(!late)script.dispatchEvent(new w.Event('load'));
        await Promise.resolve();
        assert.equal(frame.title,'Chat with Valiant Garage Door');
        assert.ok(w.document.querySelector('.global-chat-facade'));
        frame.dispatchEvent(new w.Event('load'));
        assert.equal(w.document.querySelector('.global-chat-facade'),null);
        assert.equal(w.document.getElementById('proChatIframe'),frame);
      } finally {dom.window.close();}
    }
  });

  test(file+': standalone business card uses same intent flow and an existing provider is not duplicated',()=>{
    const card=setup(file,'/business-card');
    try {assert.ok(card.w.document.getElementById('valiant-chat-launcher'));assert.equal(card.w.document.querySelectorAll(provider).length,0);}
    finally {card.dom.window.close();}
    const existing=setup(file,'/services',w=>{const frame=w.document.createElement('iframe');frame.id='proChatIframe';w.document.body.appendChild(frame);});
    try {assert.equal(existing.w.document.querySelector('.global-chat-facade'),null);assert.equal(existing.w.document.querySelectorAll(provider).length,0);}
    finally {existing.dom.window.close();}
  });

  test(file+': custom landing pages get only scoped launcher CSS; shared-style pages have no redundant CSS request',()=>{
    for(const pathname of ['/404','/COMMUNITY-PROJECT','/address-selection-hidden','/moenave-garage-doors','/nextdoor-emergency-repair','/services/PLEASANTON-BROKEN-SPRING-REPAIR']) {
      const {dom,w}=setup(file,pathname);
      try {
        const styles=[...w.document.querySelectorAll('link[rel="stylesheet"]')];
        assert.equal(styles.length,1,pathname);
        assert.equal(styles[0].id,'valiant-chat-launcher-style');
        assert.match(styles[0].getAttribute('href'),/^\/css\/chat-launcher\.min\.css\?v=[a-f0-9]{12}$/);
        assert.equal(w.document.querySelectorAll('link[href*="global-chrome"]').length,0);
        w.eval(source(file));assert.equal(w.document.querySelectorAll('#valiant-chat-launcher-style').length,1);
        assert.equal(w.document.querySelectorAll(provider).length,0);
      } finally {dom.window.close();}
    }
    for(const name of ['global-chrome.css','global-chrome.min.css?v=existing']) {
      const {dom,w}=setup(file,'/services',w=>{const css=w.document.createElement('link');css.rel='stylesheet';css.href='/css/'+name;w.document.head.appendChild(css);});
      try {
        assert.equal(w.document.getElementById('valiant-chat-launcher-style'),null);
        assert.equal(w.document.querySelectorAll('link[rel="stylesheet"]').length,1);
        assert.ok(w.document.getElementById('valiant-chat-launcher'));
      } finally {dom.window.close();}
    }
  });
}

test('standalone legacy eager loader is absent from all maintained HTML/template references',()=>{
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);
  for(const file of [...walk(path.join(root,'public')),path.join(root,'lib/blog-index.html')]) {
    assert.doesNotMatch(fs.readFileSync(file,'utf8'),/<script\b[^>]*src=["'][^"']*\/js\/site-bot(?:\.min)?\.js(?:\?[^"']*)?["']/i,file);
  }
});

test('facade styling stays scoped and exposes visible focus and adequate controls',()=>{
  const css=fs.readFileSync(path.join(root,'public/css/global-chrome.css'),'utf8');
  const owned=css.slice(css.indexOf('/* Intent-only official Housecall Pro chat;'));
  assert.ok(owned.startsWith('/* Intent-only'));
  assert.match(owned,/\.global-chat-facade button:focus-visible/);
  assert.match(owned,/min-height:52px/);assert.match(owned,/@media\(pointer:coarse\).*min-height:44px/);
  assert.doesNotMatch(owned,/(?:^|[}\n])\s*(?:body|html|\*)\s*[{,]/);
});

test('fallback stylesheet exactly matches shared facade source and its URL identifies the served minified bytes',()=>{
  const css=fs.readFileSync(path.join(root,'public/css/global-chrome.css'),'utf8');
  const facade=css.slice(css.indexOf('/* Intent-only official Housecall Pro chat;'));
  assert.equal(fs.readFileSync(path.join(root,'public/css/chat-launcher.css'),'utf8'),facade);
  const min=fs.readFileSync(path.join(root,'public/css/chat-launcher.min.css'),'utf8').trimEnd();
  const compact=new (require('clean-css'))({level:1,rebase:false}).minify(facade);
  assert.equal(compact.errors.length,0);assert.equal(min,compact.styles);
  const hash=crypto.createHash('sha256').update(min).digest('hex').slice(0,12);
  assert.ok(source('global-chrome.js').includes('/css/chat-launcher.min.css?v='+hash));
});
