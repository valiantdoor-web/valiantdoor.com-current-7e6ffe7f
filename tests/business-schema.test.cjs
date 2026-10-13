const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeGraph,profile}=require('../lib/blog-business-schema');
const {renderArticle,renderIndex}=require('../lib/blog-publishing');
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
