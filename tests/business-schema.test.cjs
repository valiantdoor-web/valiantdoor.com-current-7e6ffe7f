const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeGraph,profile}=require('../lib/blog-business-schema');
const {renderArticle,renderIndex}=require('../lib/blog-publishing');
const fs=require('node:fs');
const path=require('node:path');
function businessNodes(html){
 const values=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 const nodes=[];
 const walk=x=>{if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){if([x['@type']].flat().includes('LocalBusiness'))nodes.push(x);Object.values(x).forEach(walk);}};
 values.forEach(walk);return nodes;
}
test('an imported provider stub resolves to one complete company without changing the service offer',()=>{
 const graph=normalizeGraph([{'@context':'https://schema.org','@graph':[
  {'@type':'LocalBusiness',name:'Valiant Garage Door',makesOffer:{'@type':'Offer',name:'Page-specific service',price:'149'}},
  {'@type':'Service',name:'Repair',provider:{'@type':'LocalBusiness',name:'Valiant Garage Door LLC'}}
 ]}]);
 const businesses=graph['@graph'].filter(n=>[n['@type']].flat().includes('LocalBusiness'));
 assert.equal(businesses.length,1);assert.equal(businesses[0].address.streetAddress,'3588 Pimlico Dr');
 assert.equal(businesses[0].makesOffer[0].price,'149');
 assert.deepEqual(graph['@graph'].find(n=>n['@type']==='Service').provider,{'@id':profile['@id']});
});
test('live blog index and imported articles publish the same credentials and no addressless business',()=>{
 const a={slug:'schema-regression-fixture',title:'Garage door inspection',description:'A documented inspection.',content:'<p>Inspection findings.</p>',language:'en',publishedAt:'2026-10-12T12:00:00Z',updatedAt:'2026-10-12T12:00:00Z',jsonLd:{'@context':'https://schema.org','@type':'BlogPosting',headline:'Garage door inspection',publisher:{'@type':'LocalBusiness',name:'Valiant Garage Door'}}};
 for(const html of [renderIndex([]),renderArticle(a)]){
  const businesses=businessNodes(html);assert.equal(businesses.length,1);
  assert.equal(businesses[0].hasCredential.identifier,'1160068');
  assert.equal(businesses[0].hasCertification.certificationIdentification,'2953');
  assert.equal(businesses[0].additionalProperty.find(p=>p.name==='City of Pleasanton business license').value,'Valiant Garage Door LLC');
  assert.equal(businesses[0].additionalProperty.find(p=>p.name==="Workers' compensation record").value,'CSLB exemption for no employees; effective July 9, 2026.');
  assert.match(html,/<dt>City business license<\/dt>/);
  assert.match(html,/data-valiant-credential-details/);assert.match(html,/CSG0050855800/);
 }
});
test('customer testimonials remain visible without unsupported service or self-serving business review markup',()=>{
 const pages=[
  ['wayne-dalton-torsion-conversion','Veerraju Amanchi'],
  ['case-studies/pleasanton-garage-door-spring-repair','Vikram Gupta'],
  ['blog/pleasanton-garage-door-spring-repair-case-study','Vikram Gupta'],
 ];
 for(const [route,author] of pages){
  const html=fs.readFileSync(path.join(__dirname,'../public',route,'index.html'),'utf8');
  const graphs=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  const walk=value=>{
   if(Array.isArray(value))value.forEach(walk);
   else if(value&&typeof value==='object'){
    assert.ok(![value['@type']].flat().includes('Review'),`${route}: unsupported Review node`);
    assert.equal(value.review,undefined,`${route}: dangling review reference`);
    Object.values(value).forEach(walk);
   }
  };
  graphs.forEach(walk);
  const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  assert.ok(visible.includes(author),`${route}: testimonial author is still visible`);
  assert.equal(businessNodes(html).length,1,`${route}: company identity is retained`);
 }
});
