// Approved SEO additions. Keep owner copy intact and never infer private job facts.
const fs = require('node:fs');
const path = require('node:path');
const {load} = require('cheerio');
const root = path.resolve(__dirname, '..');
const base = 'https://www.valiantdoor.com';
const {cities} = require('./refresh-seo-reference.cjs');
const answers = {
  Fremont: 'For a stuck door, failed opener, or broken spring in Fremont, Valiant Garage Door starts with diagnosis and an itemized recommendation. Call (925) 409-4974 or book an estimate online. California contractor license #1160068 covers the business; phone requests are answered 24/7, while dispatch depends on technician, route, and parts availability.',
  Pleasanton: 'Valiant Garage Door is based at a staffed Pleasanton storefront at 3588 Pimlico Dr. We handle broken springs, opener faults, cables, and off-track doors under California contractor license #1160068. Call (925) 409-4974 or book online; storefront and phone hours are 24/7, with technician dispatch confirmed separately according to availability.',
  'San Ramon': 'Need a garage door diagnosed in San Ramon? Valiant Garage Door handles spring, cable, track, and opener problems, with pricing explained before approved work. Reach the team at (925) 409-4974 or book an estimate online. CSLB #1160068; phone answering is available 24/7, and dispatch depends on route, technician, and parts availability.',
  Dublin: 'Dublin homeowners can contact Valiant Garage Door for broken springs, enclosed-spring conversions, noisy openers, and off-track doors. The Dublin spring-service and documented-project links below help explain the options before booking. Call (925) 409-4974 or request an estimate online. CSLB #1160068; phones are answered 24/7, with dispatch confirmed by availability.',
  Livermore: 'For Livermore garage door service, Valiant Garage Door checks the door, hardware, and opener before recommending repairs. Published starting prices below are a guide, not a substitute for diagnosis. Book an estimate online or call (925) 409-4974, answered 24/7. CSLB #1160068; technician dispatch depends on route, parts, and availability.',
  Danville: 'Valiant Garage Door serves Danville with repair, spring replacement, opener diagnostics, and safety-focused recommendations. Review the published starting prices and documented Danville work below, then call (925) 409-4974 or book an estimate online. The business holds CSLB #1160068. Phone requests are answered 24/7; arrival is confirmed according to technician and route availability.',
  Sunol: 'Sunol garage door requests are scheduled with route, parts, and technician availability in mind. Valiant Garage Door handles broken springs, opener issues, cables, and off-track doors under CSLB #1160068. Call (925) 409-4974, answered 24/7, or book an estimate online. Published starting prices below help you prepare for the inspection and quote.'
};
// These are existing public, sitemap-published records, not newly imported jobs.
const proof = {
  Fremont: ['107636485','3519387368'], Pleasanton: ['104831415','3406305261'],
  'San Ramon': ['104647302','3159355494'], Dublin: ['106758977','3245135586'],
  Livermore: ['105345788','3214820474'], Danville: ['104942719','3171251729']
};
const titles = {
  'infinity-shield-garage-door-sensor':'Infinity Shield Installation Pleasanton | Valiant',
  'garage-door-openers':'Garage Door Openers Pleasanton & Tri-Valley | Valiant'
};
const descriptions = {
  'garage-door-repair-san-ramon':'Garage door repair in San Ramon for springs, cables and opener faults. CSLB #1160068. Call 24/7; same-day dispatch when available.',
  'garage-door-repair-fremont':'Fremont garage door company for broken springs, opener repair and off-track doors. CSLB #1160068. Call 24/7 or book an estimate.',
  'garage-door-repair-pleasanton':'Garage door repair in Pleasanton for springs, cables and openers. Staffed storefront and phones open 24/7. CSLB #1160068. Book an estimate.',
  'garage-door-repair-dublin-ca':'Garage door repair in Dublin, CA for broken springs, opener faults and off-track doors. CSLB #1160068. Call 24/7; dispatch by availability.',
  'emergency-garage-door-repair':'Emergency garage door repair in Pleasanton and the Tri-Valley. Call 24/7; dispatch by availability. CSLB #1160068. After-hours charges apply.',
  'garage-door-openers':'Garage door openers in Pleasanton and the Tri-Valley. Compare LiftMaster installation, wall-mount upgrades and repair. CSLB #1160068.',
  'quote':'Book a garage door service estimate in Pleasanton and the Tri-Valley. Call 24/7 for springs, openers or urgent repairs. CSLB #1160068.',
  'infinity-shield-garage-door-sensor':'Infinity Shield installation in Pleasanton and the Tri-Valley. Get 25-beam garage door sensor compatibility checks and installation. CSLB #1160068.',
  'google-business-profile':'Find Valiant Garage Door in Pleasanton: staffed address, 24/7 hours, repair services and the official Google profile. CSLB #1160068.'
};
const h1Additions = {
  'infinity-shield-garage-door-sensor':'Infinity Shield installation in Pleasanton & the Tri-Valley',
  'garage-door-openers':'Installation in Pleasanton & the Tri-Valley'
};
const routes = [...new Set([...cities.map(c=>c[1]), ...Object.keys(descriptions), 'service-areas'])];
const escape = v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fileFor = r=>path.join(root,'public',r,'index.html');
const section = (kind,body)=>`\n<section class="seo-completion" data-valiant-seo-completion="${kind}">${body}</section>\n`;
const managedPattern = kind=>new RegExp('<section\\b[^>]*data-valiant-seo-completion="'+kind+'"[^>]*>[\\s\\S]*?<\\/section>','g');
const afterHero = (html,block)=>{
  let missing='';
  for(const match of block.matchAll(/<section\b[^>]*data-valiant-seo-completion="([^"]+)"[^>]*>[\s\S]*?<\/section>/g)){
    const pattern=managedPattern(match[1]);
    if(pattern.test(html))html=html.replace(managedPattern(match[1]),()=>match[0]);
    else missing+='\n'+match[0]+'\n';
  }
  if(!missing)return html;
  if(!/<main\b[^>]*>[\s\S]*?<\/section>/i.test(html))throw Error('Missing hero section');
  return html.replace(/<main\b[^>]*>[\s\S]*?<\/section>/i,match=>match+missing);
};
function refresh() {
  const portfolio=JSON.parse(fs.readFileSync(path.join(root,'public/data/project-portfolio.json'),'utf8')).projects;
  const sitemap=fs.readFileSync(path.join(root,'public/sitemap-portfolio.xml'),'utf8');
  let changed=0;
  for(const route of routes) {
    const file=fileFor(route),before=fs.readFileSync(file,'utf8');let html=before;
    // Update only owned sections in place; do not normalize owner whitespace.
    const city=cities.find(c=>c[1]===route)?.[0];
    if(city) {
      const answer=section('city-answer',`<h2>Garage door service in ${escape(city)}: quick answer</h2><p>${escape(answers[city])} <a href="/quote">Book a ${escape(city)} service estimate</a>.</p>`);
      const rows=[['garage-door-spring-replacement','Single spring replacement','$159'],['garage-door-spring-replacement','Double spring replacement','$189'],['garage-door-opener-repair','Opener repair','$149'],['garage-door-off-track-repair','Off-track repair','$149']];
      let details=`<h2>Starting prices in ${escape(city)}</h2><table><caption>Published garage door service starting prices — ${escape(city)}</caption><thead><tr><th scope="col">Service</th><th scope="col">Starting price</th></tr></thead><tbody>${rows.map(([url,label,price])=>`<tr><th scope="row"><a href="/${url}">${label}</a></th><td>From ${price}</td></tr>`).join('')}</tbody></table><p>These published starting prices are not a final quote. Required parts, labor, and the inspection determine the approved price. Appointments at 7:00 PM or later have a $100 service charge before approved parts or repairs. <a href="/blog/garage-door-repair-cost-pleasanton">Repair cost guide</a> · <a href="/blog/garage-door-spring-replacement-cost">Spring cost guide</a>.</p>`;
      html=afterHero(html,answer+section('city-prices',details));
      if(proof[city]) {
        const [id,photoId]=proof[city],project=portfolio.find(p=>p.id===id),photo=project?.photos.find(p=>p.id===photoId);
        if(!project||project.city!==city||!photo?.description||!sitemap.includes(base+project.url))throw Error('Unverified public proof for '+city);
        const phtml=fs.readFileSync(fileFor(project.url.slice(1)),'utf8');
        if(!phtml.includes(escape(photo.description))&&!phtml.includes(photo.description))throw Error('Caption missing from public project '+id);
        const block=section('city-proof',`<h2>Documented garage door work in ${escape(city)}</h2><p>This existing public ${escape(city)} project record includes the technician caption:</p><blockquote>${escape(photo.description)}</blockquote><p><a href="${escape(project.url)}">View the ${escape(city)} project photos and recorded scope</a>. The original project record controls what was documented; this is not a new customer review or a promise that every repair has the same scope.</p>`);
        html=managedPattern('city-proof').test(html)?html.replace(managedPattern('city-proof'),()=>block.trim()):html.replace(/<\/main>/i,block+'</main>');
      }
    }
    if(h1Additions[route]&&!html.includes('data-valiant-seo-completion="h1-location"')) html=html.replace(/(<h1\b[^>]*>[\s\S]*?)(<\/h1>)/i,(_,start,end)=>start+`<span class="seo-completion-h1" data-valiant-seo-completion="h1-location">${escape(h1Additions[route])}</span>`+end);
    if(Object.hasOwn(h1Additions,route)) {
      const system=route==='garage-door-openers'?'garage door opener installation and repair':'Infinity Shield compatibility checks and installation';
      html=afterHero(html,section('local-service',`<h2>${route==='garage-door-openers'?'Garage door opener service':'Infinity Shield installation'} in Pleasanton &amp; the Tri-Valley</h2><p>Valiant Garage Door provides ${system} in ${cities.map(c=>escape(c[0])).join(', ')}. The staffed Pleasanton storefront and phone line are open 24/7. Technician dispatch depends on route, parts, and availability. CSLB #1160068.</p><p><a href="/quote">In the Bay Area? Book a technician estimate</a> · <a href="tel:+19254094974">Call (925) 409-4974</a>.</p>`));
    }
    if(['quote','google-business-profile'].includes(route)) html=afterHero(html,section('hours',`<h2>Staffed Pleasanton storefront and phone: open 24/7</h2><p>3588 Pimlico Dr, Pleasanton, CA 94588. Owner-confirmed storefront and phone-answering hours: 24 hours a day, seven days a week. Dispatch depends on technician, route, and parts availability; published after-hours charges remain in effect.</p><p><a href="tel:+19254094974">Call (925) 409-4974</a> · <a href="/quote">Request a service estimate</a>.</p>`));
    if(route==='service-areas') {
      const $=load(html),targets=[['Our Core Service Areas In The East Bay','core-service-cities'],['Valiant Live Projects Map','live-projects-map']];
      for(const [heading,id]of targets) {
        const headingNode=$('h2').filter((i,e)=>$(e).text().trim().toLowerCase()===heading.toLowerCase()).first();
        const target=headingNode.closest('section');if(!target.length)throw Error('Missing map/city section');
        if(!target.attr('id')){const outer=$.html(target);html=html.replace(outer,outer.replace(/^<section\b/,`<section id="${id}"`));}
      }
      // Use native anchors, not JS-only controls or fake clickable map images.
      const nav=section('area-jumps','<nav aria-label="Service area shortcuts"><a href="#core-service-cities">Jump to the city list</a><a href="#live-projects-map">Jump to the live projects map</a><a href="/quote">Request service in your area</a></nav>');
      html=afterHero(html,nav);
    }
    if(titles[route]) {
      const value=escape(titles[route]);html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${value}</title>`).replace(/(<meta\b[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=)["'][^"']*["']/gi,(_,p)=>p+`"${value}"`);
    }
    if(descriptions[route]){const value=escape(descriptions[route]);html=html.replace(/(<meta\b[^>]*(?:property|name)=["'](?:description|og:description|twitter:description)["'][^>]*content=)["'][^"']*["']/gi,(_,p)=>p+`"${value}"`);}
    if(!html.includes('/css/seo-completion.css'))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/css/seo-completion.css?v=20261025">\n</head>');
    if(html!==before){fs.writeFileSync(file,html);changed++;}
  }
  const file=path.join(root,'public/llms.txt'),before=fs.readFileSync(file,'utf8');
  if(!before.includes('- Staffed storefront and phone hours:')){fs.writeFileSync(file,before.replace(/(- Emergency availability:[^\n]*)/,(_,line)=>line+'\n- Staffed storefront and phone hours: open 24/7 at 3588 Pimlico Dr, Pleasanton, CA 94588 (owner confirmed October 25, 2026). Technician dispatch remains subject to availability.'));changed++;}
  return changed;
}
if(require.main===module)console.log(`SEO completion additions refreshed in ${refresh()} files.`);
module.exports={refresh,cities,answers,proof,titles,descriptions,routes};
