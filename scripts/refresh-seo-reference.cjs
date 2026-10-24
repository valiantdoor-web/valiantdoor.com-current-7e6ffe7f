// Additions from the owner's 2026-10-24 Notion/Linear SEO reference.
// Existing body copy is never rewritten. Keep this repeatable in Vercel builds.
const fs = require('node:fs');
const path = require('node:path');
const {load} = require('cheerio');
const root = path.resolve(__dirname, '..');
const cities = [
  ['Pleasanton','garage-door-repair-pleasanton'], ['Dublin','garage-door-repair-dublin-ca'],
  ['Livermore','garage-door-repair-livermore'], ['San Ramon','garage-door-repair-san-ramon'],
  ['Danville','garage-door-repair-danville'], ['Fremont','garage-door-repair-fremont'],
  ['Sunol','garage-door-repair-sunol']
];
const areaSources = ['', 'services', 'service-areas', 'garage-door-repair', ...cities.map(c=>c[1]),
  'garage-door-spring-replacement','garage-door-opener-repair','garage-door-openers',
  'garage-door-cable-repair','garage-door-off-track-repair','safety-sensors',
  'emergency-garage-door-repair','services/garage-door-maintenance','tune-up-safety-inspection',
  'new-garage-door-installation','wayne-dalton-torsion-conversion','infinity-shield-garage-door-sensor',
  'valiant-signature-opener-mount','valiant-carriage-door-restorations',
  'broken-spring-repair-dublin-ca','garage-door-repair-east-dublin','e900-tilt-up-garage-door-repair',
  'emergency-after-hours','repair-guides', 'services/commercial'];
const titles = {
  '': 'Garage Door Repair Pleasanton & Tri-Valley | Valiant Garage Door',
  'garage-door-repair-san-ramon': 'Garage Door Repair San Ramon, CA | Same-Day | Valiant',
  'garage-door-repair-fremont': 'Garage Door Company in Fremont, CA | Repair & Openers | Valiant',
  'videos/how-to/what-does-professional-garage-door-maintenance-include': 'Professional Garage Door Maintenance Video | Valiant',
  'repair-guides/garage-door-springs-how-they-work-and-why-they-matter': 'How Garage Door Springs Work | Valiant Garage Door',
  'videos/companycam/21998887': 'Garage Door Project Video 21998887 | Valiant Garage Door',
  'videos/how-to/how-do-professionals-change-garage-door-rollers-quickly': 'Professional Garage Door Roller Replacement Video | Valiant'
};
// The live blog template and repair guide index already have distinct metas.
// Preserve those current descriptions instead of applying the stale duplicate finding.
const descriptions = {};
const priceGuides = [
  ['blog/garage-door-repair-cost-pleasanton','Garage door repair costs in Pleasanton'],
  ['blog/garage-door-spring-replacement-cost','Garage door spring replacement costs']
];
const guides = new Map();
function add(sources, targets) {
  for (const source of sources) {
    const entries = guides.get(source)||new Map();
    for (const [route,label] of targets) if(route!==source) entries.set(route,label);
    guides.set(source,entries);
  }
}
add([...cities.map(c=>c[1]),'garage-door-spring-replacement','garage-door-opener-repair','garage-door-openers'],priceGuides);
add(['garage-door-spring-replacement','garage-door-repair-dublin-ca','site-map'],[
  ['broken-spring-repair-dublin-ca','Broken spring repair in Dublin']]);
add(['garage-door-spring-replacement','site-map'],[
  ['wayne-dalton-torsion-conversion','Wayne-Dalton TorqueMaster conversion']]);
add(['garage-door-spring-replacement'],[
  ['offers/spring-replacement-75-off','Spring replacement offer'],
  ['blog/why-garage-door-springs-break','Why garage door springs break']]);
add(['emergency-garage-door-repair'],[
  ['blog/emergency-garage-door-repair-guide','Emergency garage door repair guide']]);
add(['services','garage-door-openers'],[
  ['infinity-shield-garage-door-sensor','Infinity Shield garage door sensor'],
  ['valiant-signature-opener-mount','Valiant Signature opener mount'],
  ['valiant-carriage-door-restorations','Valiant carriage door restorations'],
  ['new-garage-door-installation','New garage door installation']]);
add(['garage-door-opener-repair'],[['valiant-signature-opener-mount','Valiant Signature opener mount']]);
const troubleshooting = [
  [['safety-sensors','garage-door-opener-repair','repair-guides'],[
    ['blog/garage-door-wont-close','Why a garage door will not close'],
    ['blog/garage-door-sensor-problems','Garage door safety sensor problems']]],
  [['garage-door-opener-repair','garage-door-openers','repair-guides'],[
    ['blog/garage-door-wont-open','Why a garage door will not open'],
    ['blog/liftmaster-troubleshooting','LiftMaster troubleshooting']]],
  [['garage-door-off-track-repair','garage-door-repair','repair-guides'],[
    ['blog/garage-door-off-track','Garage door off-track guide']]],
  [['garage-door-cable-repair','garage-door-repair','repair-guides'],[
    ['blog/broken-garage-door-cable','Broken garage door cable guide']]],
  [['services/garage-door-maintenance','tune-up-safety-inspection','repair-guides'],[
    ['blog/garage-door-making-noise','Noisy garage door guide'],
    ['blog/essential-garage-door-maintenance-tips-pleasanton-homes','Garage door maintenance tips for Pleasanton homes']]]
];
troubleshooting.forEach(([sources,targets])=>add(sources,targets));
const escape = value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fileFor = route=>path.join(root,'public',route,'index.html');
const style = '<link rel="stylesheet" href="/css/seo-reference-additions.css?v=20261024">';
const section = (kind,title,links)=>`\n<section class="valiant-seo-reference container" data-valiant-seo-reference="${kind}" aria-label="${escape(title)}"><h2>${escape(title)}</h2><ul>${links.map(([route,label])=>`<li><a href="/${escape(route)}">${escape(label)}</a></li>`).join('')}</ul></section>\n`;
function refresh() {
  const routes = new Set([...areaSources,...Object.keys(titles),...Object.keys(descriptions),...guides.keys(),'emergency-garage-door-repair']);
  let changed=0;
  for (const route of routes) {
    const file=fileFor(route);
    if(!fs.existsSync(file)) throw new Error(`Missing reference route: ${route}`);
    const before=fs.readFileSync(file,'utf8');let html=before;
    const $=load(before);
    const isIndexable=!/noindex/i.test($('meta[name="robots"]').attr('content')||'');
    if (areaSources.includes(route) && isIndexable && !html.includes('data-valiant-seo-reference="areas"')) {
      const links=cities.filter(c=>c[1]!==route).map(([city,target])=>[target,`Garage door repair in ${city}`]);
      html=html.replace(/<\/main>/i,section('areas','Repair service areas',links)+'</main>');
    }
    if(guides.has(route) && !html.includes('data-valiant-seo-reference="guides"')) {
      const existing=new Set();$('a[href]').each((i,e)=>{try{existing.add(new URL($(e).attr('href'),'https://www.valiantdoor.com/').pathname.replace(/\/$/,''))}catch{}});
      const links=[...guides.get(route)].filter(([target])=>!existing.has('/'+target));
      if(links.length) html=html.replace(/<\/main>/i,section('guides','Related repair guides and services',links)+'</main>');
    }
    if(route==='emergency-garage-door-repair' && !html.includes('data-valiant-seo-reference="emergency"')) {
      const block='\n<section class="valiant-seo-reference container" data-valiant-seo-reference="emergency" aria-label="Emergency repair availability"><h2>Emergency repair: availability and pricing</h2><p>Urgent garage door repair requests are accepted by phone 24/7. Dispatch timing depends on technician, route, and parts availability. Appointments at 7:00 PM or later have a $100 service charge before approved parts or repairs. Pricing is shown before work begins. <a href="tel:+19254094974">Call (925) 409-4974</a> to confirm availability.</p></section>\n';
      html=html.replace(/(<main\b[^>]*>[\s\S]*?<\/section>)/i,match=>match+block);
    }
    if(titles[route]) {
      const title=escape(titles[route]);
      html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${title}</title>`)
        .replace(/(<meta\b[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=)["'][^"']*["']/gi,`$1"${title}"`);
    }
    if(descriptions[route]) {
      const description=escape(descriptions[route]);
      html=html.replace(/(<meta\b[^>]*(?:property|name)=["'](?:description|og:description|twitter:description)["'][^>]*content=)["'][^"']*["']/gi,`$1"${description}"`);
    }
    if(['broken-spring-repair-dublin-ca','garage-door-repair-east-dublin'].includes(route)) {
      const blocks=[];$('script[type="application/ld+json"]').each((i,e)=>{const g=JSON.parse($(e).text());blocks.push(...(g['@graph']||[g]));});
      if(!blocks.some(n=>[n['@type']].flat().includes('BreadcrumbList'))) {
        const nav=$('nav[aria-label="Breadcrumb"]').first();
        const items=nav.find('a').map((i,e)=>({'@type':'ListItem',position:i+1,name:$(e).text().trim(),item:new URL($(e).attr('href'),'https://www.valiantdoor.com/').href})).get();
        items.push({'@type':'ListItem',position:items.length+1,name:nav.children('span').last().text().trim(),item:'https://www.valiantdoor.com/'+route});
        const graph={'@context':'https://schema.org','@type':'BreadcrumbList','@id':'https://www.valiantdoor.com/'+route+'#breadcrumb',itemListElement:items};
        html=html.replace(/<\/head>/i,'<script type="application/ld+json">'+JSON.stringify(graph).replace(/</g,'\\u003c')+'</script>\n</head>');
      }
    }
    if(html.includes('data-valiant-seo-reference=')&&!html.includes('/css/seo-reference-additions.css')) html=html.replace(/<\/head>/i,style+'\n</head>');
    if(html!==before){fs.writeFileSync(file,html);changed++;}
  }
  const file=path.join(root,'public/llms.txt');
  const before=fs.readFileSync(file,'utf8');
  const after=before.replace('serving Danville, Fremont, Sunol, and surrounding areas','serving Pleasanton, Dublin, Livermore, San Ramon, Danville, Fremont, Sunol, and surrounding areas');
  if(after!==before){fs.writeFileSync(file,after);changed++;}
  return changed;
}
if(require.main===module) console.log(`SEO reference additions refreshed in ${refresh()} files.`);
module.exports={refresh,cities,areaSources,titles,descriptions,guides};
