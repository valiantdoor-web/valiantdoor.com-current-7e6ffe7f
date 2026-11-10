const {test}=require('node:test');
const assert=require('node:assert/strict');
const {calculateSpringEstimate,DOORS}=require('../public/js/spring-calculator.js');
const base={tier:'endurance',door:'double',count:2,profile:'steel25',urgency:0};
test('page retains the approved non-calculator copy and current spring policy',()=>{
  const fs=require('node:fs'),{load}=require('cheerio');
  const {mainDigest}=require('./helpers/editorial-copy.cjs');
  const html=fs.readFileSync(require('node:path').join(__dirname,'../public/garage-door-spring-replacement/index.html'),'utf8');
  const $=load(html);
  assert.equal($('[data-spring-calculator]').length,1);
  assert.match($('section[aria-labelledby="spring-service-policies"]').text(),/\$99 after-hours/);
  assert.ok(!html.includes('Upgrade quoted separately'));
  $('[data-spring-calculator]').remove();
  assert.equal(mainDigest($.html()),'3aaef7e0fde6a6ff0d67fb0ac022872076165e2c4b407d0ea1bc9736ebeda123');
});
test('all three packages include actual spring costs and the stated warranties',()=>{
  for(const [tier,price,warranty] of [['endurance',99,5],['pro',129,5],['max',149,10]]){
    const q=calculateSpringEstimate({...base,tier});
    assert.equal(q.unitPrice,price);assert.equal(q.parts,price*2);assert.equal(q.warranty,warranty);
    assert.equal(q.installation,189);assert.equal(q.total,price*2+189);
  }
});
test('door construction chooses the owner-specified wire size and per-spring price',()=>{
  for(const [profile,size,unit] of [['steel25','.207',99],['steel24','.218',109],['insulated138','.225',119],['insulated2','.234',129],['wood','.250',149],['backedwood','.262',159]]){
    const q=calculateSpringEstimate({...base,profile});
    assert.equal(q.size,size);assert.equal(q.unitPrice,unit);assert.equal(q.parts,unit*2);assert.equal(q.total,unit*2+189);
  }
});
test('carriage and full-view presets always use all four springs and $250 labor',()=>{
  for(const [profile,size,unit,total] of [['carriage234','.234',129,766],['carriage250','.250',149,846],['fullview','.218',109,686]]){
    for(const door of ['single','double']){
      const q=calculateSpringEstimate({...base,door,profile,count:1});
      assert.equal(q.count,4);assert.equal(q.size,size);assert.equal(q.parts,unit*4);assert.equal(q.installation,250);assert.equal(q.total,total);
    }
  }
  assert.equal(calculateSpringEstimate({...base,profile:'fullview',tier:'max',urgency:2}).total,985);
});
test('all door presets retain the $10 per wire-size step rule for each selected package',()=>{
  for(const profile of Object.keys(DOORS)){
    for(const [tier,price] of [['endurance',99],['pro',129],['max',149]]){
      const q=calculateSpringEstimate({...base,profile,tier});
      assert.equal(q.unitPrice,price+q.sizeStep*10);assert.equal(q.parts,q.unitPrice*q.count);
    }
  }
});
test('single-spring installation and $99 after-hours fee are included in installed total',()=>{
  const q=calculateSpringEstimate({...base,tier:'max',count:1,profile:'insulated138',urgency:2});
  assert.equal(q.parts,169);assert.equal(q.installation,159);assert.equal(q.afterHours,99);assert.equal(q.total,427);
  assert.equal(calculateSpringEstimate({...base,urgency:1}).afterHours,0);
});
test('invalid selections cannot yield NaN or negative prices',()=>{
  const q=calculateSpringEstimate({tier:'invalid',count:-1,profile:'invalid',urgency:100});
  assert.equal(q.total,387);assert.equal(q.warranty,5);assert.equal(q.afterHours,0);
});
test('rebuild and conversion parts packages add $250 labor without charging springs twice',()=>{
  for(const [service,count,parts,total] of [['hilift',1,459,709],['hilift',2,459,709],['wayne',1,549,799],['wayne',2,649,899],['rebuild',1,459,709],['rebuild',2,549,799]]){
    for(const tier of ['endurance','pro','max']){
      const q=calculateSpringEstimate({...base,service,count,tier,profile:'wood'});
      assert.equal(q.parts,parts);assert.equal(q.installation,250);assert.equal(q.total,total);assert.equal(q.needsQuote,false);
      assert.equal(calculateSpringEstimate({...base,service,count,tier,urgency:2}).total,total+99);
    }
  }
});
test('four-spring conversion and rebuild packages require a custom parts quote',()=>{
  for(const service of ['hilift','wayne','rebuild']){
    const q=calculateSpringEstimate({...base,service,profile:'fullview'});
    assert.equal(q.count,4);assert.equal(q.parts,null);assert.equal(q.total,null);assert.equal(q.installation,250);assert.equal(q.needsQuote,true);
  }
});
