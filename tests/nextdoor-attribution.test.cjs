const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync(require('node:path').join(__dirname,'../public/js/nextdoor-conversion.js'),'utf8');
function booking(search){
 const anchor={dataset:{baseBooking:'https://book.housecallpro.com/book/Valiant-garage-door/ae8e4a137c8c49b4b264073541533a7a?v2=true'},addEventListener(){}};
 const button={dataset:{problem:'broken-spring'},classList:{toggle(){}},querySelector(){return {textContent:'Broken spring'};},addEventListener(event,callback){this[event]=callback;}};
 const context={URL,URLSearchParams,location:{search},window:{dataLayer:[]},localStorage:{setItem(){}},document:{querySelectorAll(selector){return selector==='.track-book'?[anchor]:selector==='[data-problem]'?[button]:[];},getElementById(){return {textContent:''};}}};
 vm.runInNewContext(script,context);button.click();return new URL(anchor.href);
}
test('an internal website visit does not become a paid Nextdoor booking',()=>{
 const url=booking('');assert.equal(url.searchParams.get('utm_source'),null);assert.equal(url.searchParams.get('utm_medium'),null);assert.equal(url.searchParams.get('v2'),'true');assert.equal(url.searchParams.get('utm_content'),'broken-spring');
});
test('an actual Nextdoor click retains attribution and the selected repair problem',()=>{
 const url=booking('?ndclid=test-click&utm_medium=paid_social&utm_campaign=actual-campaign');
 assert.equal(url.searchParams.get('utm_source'),'nextdoor');assert.equal(url.searchParams.get('utm_medium'),'paid_social');assert.equal(url.searchParams.get('utm_campaign'),'actual-campaign');assert.equal(url.searchParams.get('ndclid'),'test-click');assert.equal(url.searchParams.get('utm_content'),'broken-spring');
});
test('an organic Nextdoor visit is not promoted to paid social',()=>{
 assert.equal(booking('?utm_source=nextdoor').searchParams.get('utm_medium'),'social');
});
