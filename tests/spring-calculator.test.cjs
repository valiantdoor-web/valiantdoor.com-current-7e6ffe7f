const {test}=require('node:test');
const assert=require('node:assert/strict');
const {calculateSpringEstimate}=require('../public/js/spring-calculator.js');
test('calculator is additive and preserves the spring page copy outside its section',()=>{
  const fs=require('node:fs'),{load}=require('cheerio');
  const {mainDigest}=require('./helpers/editorial-copy.cjs');
  const html=fs.readFileSync(require('node:path').join(__dirname,'../public/garage-door-spring-replacement/index.html'),'utf8');
  const $=load(html);
  assert.equal($('[data-spring-calculator]').length,1);
  $('[data-spring-calculator]').remove();
  assert.equal(mainDigest($.html()),'71152c05c68bc5cf8fd5af713d097705c2d2c12219e606fbc554bb9d29e60d81');
});
test('uses published installation starting prices for each service and spring count',()=>{
  for(const [system,single,double] of [['torsion',159,189],['highlift',459,459],['torquemaster',549,649]]){
    assert.equal(calculateSpringEstimate({system,count:1,urgency:0,finish:'standard'}).startingAmount,single);
    assert.equal(calculateSpringEstimate({system,count:2,urgency:0,finish:'standard'}).startingAmount,double);
  }
});
test('priority daytime does not invent an urgency fee; after-hours adds the published $100',()=>{
  const input={system:'torsion',count:2,finish:'standard'};
  assert.equal(calculateSpringEstimate({...input,urgency:1}).afterHours,0);
  const evening=calculateSpringEstimate({...input,urgency:2});
  assert.equal(evening.afterHours,100);
  assert.equal(evening.startingAmount,289);
});
test('premium upgrades are explicitly quoted instead of inventing an all-in product price',()=>{
  for(const finish of ['duramaster','endurance']){
    const estimate=calculateSpringEstimate({system:'torsion',count:1,urgency:0,finish});
    assert.equal(estimate.upgradeQuoted,true);
    assert.equal(estimate.startingAmount,159);
  }
});
