const {JSDOM, VirtualConsole}=require('jsdom');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const source=name=>fs.readFileSync(root+'/public/js/'+name+'.js','utf8');
const html='<html><head></head><body data-chrome="off"><main><a id="book" href="https://book.housecallpro.com/book/Valiant-Garage-Door/id?v2=true">Book</a><a id="phone" href="tel:+19254094974">Call</a><form id="lead" action="/thank-you"><input name="phone" value="5555555555"><button type="submit">Send</button></form></main></body></html>';
function setup(url='https://www.valiantdoor.com/services?utm_source=google&utm_medium=organic&utm_campaign=gbp',extra={}){
 const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){}});w.fetch=async()=>({ok:true,json:async()=>({ok:true})});
 w.IntersectionObserver=class{observe(){} disconnect(){}};w.setTimeout=()=>1;w.setInterval=()=>1;
 if(extra.saved)w.localStorage.setItem('valiant_marketing_attribution_v1',extra.saved);
 w.eval(source(extra.minified?'global-chrome.min':'global-chrome'));
 const entries=()=>Array.from(w.dataLayer||[]).map(x=>Array.from(x));
 return {dom,w,entries,events:()=>entries().filter(x=>x[0]==='event')};
}
const submit=w=>w.document.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 let s=setup();s.w.eval(source('global-chrome'));s.w.document.getElementById('book').click();s.w.document.getElementById('phone').click();
 assert.equal(s.entries().filter(e=>e[0]==='config'&&e[1]==='G-0X81XNNJM4').length,1);
 assert.equal(s.events().filter(e=>e[1]==='booking_click').length,1);
 assert.equal(s.events().filter(e=>e[1]==='phone_click').length,1);
 assert.equal(s.events().filter(e=>e[1]==='ads_conversion_Submit_lead_form_1').length,0);
 assert.ok(s.events().every(e=>e[2].send_to==='G-0X81XNNJM4'));
 let callbacks=0;s.w.ValiantAnalytics.leadAccepted('lead',()=>callbacks++);s.events().find(e=>e[1]==='ads_conversion_Submit_lead_form_1')[2].event_callback();s.events().find(e=>e[1]==='ads_conversion_Submit_lead_form_1')[2].event_callback();assert.equal(callbacks,1);
 const saved=s.w.localStorage.getItem('valiant_marketing_attribution_v1');s.dom.window.close();
 s=setup('https://www.valiantdoor.com/instant-estimate',{saved});assert.equal(s.w.ValiantAnalytics.attribution().attribution_latest_utm_campaign,'gbp');s.dom.window.close();
 for(const url of ['https://preview.vercel.app/services','http://localhost:3000/services']){
  s=setup(url);s.w.document.getElementById('book').click();s.w.ValiantAnalytics.leadAccepted('test',()=>{});
  assert.equal(s.events().length,0);assert.equal(s.entries().filter(e=>e[0]==='config').length,0);s.dom.window.close();
 }
 s=setup('https://www.valiantdoor.com/thank-you?email=private%40example.com&phone=1234');
 assert.equal(s.events().filter(e=>e[1]==='ads_conversion_Submit_lead_form_1').length,0);
 assert.ok(s.entries().filter(e=>e[0]==='config'&&e[1]==='G-0X81XNNJM4').every(e=>!e[2].page_location.includes('email')));s.dom.window.close();
 for(const outcome of ['rejected','http_error','malformed','accepted']){
  s=setup();let requests=0,payload;
  s.w.fetch=async(url,options)=>{if(!options||!options.body)return {ok:true,json:async()=>({})};requests++;payload=JSON.parse(options.body);return {ok:outcome!=='http_error',json:async()=>{if(outcome==='malformed')throw Error('bad JSON');return {ok:outcome!=='rejected'};}};};
  s.w.eval(source('lead-capture'));s.w.eval(source('lead-capture'));submit(s.w);submit(s.w);await settle();await settle();
  assert.equal(requests,1);assert.equal(payload.attribution_latest_utm_campaign,'gbp');
  assert.equal(s.events().filter(e=>e[1]==='ads_conversion_Submit_lead_form_1').length,outcome==='accepted'?1:0);
  if(outcome!=='accepted')assert.equal(s.w.document.querySelector('button').disabled,false);
  s.dom.window.close();
 }
 for(const accepted of [false,true]){
  s=setup('https://www.valiantdoor.com/instant-estimate?utm_source=nextdoor&utm_medium=paid_social&ndclid=example-click');
  const f=s.w.document.querySelector('form');f.setAttribute('data-estimate-upload','');let requests=0,payload;
  s.w.fetch=async(url,options)=>{if(!options||!options.body)return {ok:true,json:async()=>({})};requests++;payload=JSON.parse(options.body);return {ok:accepted,json:async()=>({ok:accepted})};};
  s.w.eval(source('estimate-upload'));s.w.eval(source('estimate-upload'));submit(s.w);submit(s.w);await settle();await settle();
  assert.equal(requests,1);assert.equal(payload.attribution_latest_utm_source,'nextdoor');assert.equal(payload.attribution_latest_ndclid,'example-click');
  assert.equal(s.events().filter(e=>e[1]==='ads_conversion_Submit_lead_form_1').length,accepted?1:0);s.dom.window.close();
 }
 s=setup('https://www.valiantdoor.com/services',{minified:true});
 s.w.document.getElementById('phone').click();
 assert.equal(s.entries().filter(e=>e[0]==='config'&&e[1]==='G-0X81XNNJM4').length,1);
 assert.equal(s.events().filter(e=>e[1]==='phone_click'&&e[2].send_to==='G-0X81XNNJM4').length,1);
 s.dom.window.close();
 const minified=source('global-chrome.min').trimEnd(),versions=require('../data/site-asset-versions.json');
 assert.equal(versions['/js/global-chrome.min.js'],'/js/global-chrome.min.js?v='+require('node:crypto').createHash('sha256').update(minified).digest('hex').slice(0,12));
 console.log('PASS: canonical property 549338938 / G-0X81XNNJM4 in source and hashed bundle; one destination; no click-as-lead; no preview measurement; no pageview-as-lead; accepted/rejected/malformed/double-submit cases; campaign persistence; photo-estimate flow.');
})().catch(error=>{console.error(error);process.exitCode=1;});
