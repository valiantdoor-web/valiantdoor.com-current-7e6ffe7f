const {test}=require('node:test');
const assert=require('node:assert/strict');
const {calculateSpringEstimate,WIRE_SIZES}=require('../public/js/spring-calculator.js');
const base={tier:'endurance',count:2,size:'.207',urgency:0};
test('page retains the approved non-calculator copy and current spring policy',()=>{
  const fs=require('node:fs'),{load}=require('cheerio');
  const {mainDigest}=require('./helpers/editorial-copy.cjs');
  const html=fs.readFileSync(require('node:path').join(__dirname,'../public/garage-door-spring-replacement/index.html'),'utf8');
  const $=load(html);
  assert.equal($('[data-spring-calculator]').length,1);
  assert.match($('section[aria-labelledby="spring-service-policies"]').text(),/\$99 after-hours/);
  assert.ok(!html.includes('Upgrade quoted separately'));
  $('[data-spring-calculator]').remove();
  assert.equal(mainDigest($.html()),'ec99d895ddf68c61d6fc3e5ca4f2bcc31843409518c17b2037a7bca8d640d156');
});
test('all three packages include actual spring costs and the stated warranties',()=>{
  for(const [tier,price,warranty] of [['endurance',99,5],['pro',129,5],['max',149,10]]){
    const q=calculateSpringEstimate({...base,tier});
    assert.equal(q.unitPrice,price);assert.equal(q.parts,price*2);assert.equal(q.warranty,warranty);
    assert.equal(q.installation,189);assert.equal(q.total,price*2+189);
  }
});
test('every wire-size step adds $10 to each spring, not once to the job',()=>{
  WIRE_SIZES.forEach((size,index)=>{
    const q=calculateSpringEstimate({...base,size});
    assert.equal(q.unitPrice,99+index*10);assert.equal(q.parts,(99+index*10)*2);
    assert.equal(q.total,(99+index*10)*2+189);
  });
});
test('single-spring installation and $99 after-hours fee are included in installed total',()=>{
  const q=calculateSpringEstimate({...base,tier:'max',count:1,size:'.225',urgency:2});
  assert.equal(q.parts,169);assert.equal(q.installation,159);assert.equal(q.afterHours,99);assert.equal(q.total,427);
  assert.equal(calculateSpringEstimate({...base,urgency:1}).afterHours,0);
});
test('invalid selections cannot yield NaN or negative prices',()=>{
  const q=calculateSpringEstimate({tier:'invalid',count:-1,size:'invalid',urgency:100});
  assert.equal(q.total,387);assert.equal(q.warranty,5);assert.equal(q.afterHours,0);
});
