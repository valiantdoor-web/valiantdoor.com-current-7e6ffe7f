#!/usr/bin/env node
// Reproducible maintenance for the public website and its live blog template.
const fs = require('node:fs');
const path = require('node:path');
const {normalizeHtmlSchema, addCredentialDetails} = require('../lib/blog-business-schema');
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SITE = 'https://www.valiantdoor.com';
const VERSION = '20261012-site-repair';
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e =>
  e.isDirectory() ? walk(path.join(dir,e.name)) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []);
const routeFor = file => file.endsWith('blog-index.html') ? '/blog' :
  '/' + path.relative(PUBLIC,file).replaceAll('\\','/').replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = value => String(value).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const titleOf = html => text(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
const eligible = (html,route) => /<h1\b/i.test(html) && !/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html) && route !== '/404';
function metadata(html, kind, value) {
  if (kind === 'title') {
    html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, '<title>'+escape(value)+'</title>');
  }
  const names = kind === 'title' ? ['og:title','twitter:title'] : ['description','og:description','twitter:description'];
  return html.replace(/<meta\b[^>]*>/gi, tag => {
    const key=tag.match(/(?:name|property)=["']([^"']+)["']/i)?.[1];
    return names.includes(key) ? tag.replace(/content=["'][\s\S]*?["'](?=\s|\/?>)/i, 'content="'+escape(value)+'"') : tag;
  });
}
const conciseTitles = {
 '/case-studies/pleasanton-garage-door-spring-repair':'Pleasanton Spring Repair: Correcting Installation | Valiant',
 '/repair-guides/garage-door-springs-how-they-work-and-why-they-matter':'How Garage Door Springs Work | Valiant Garage Door',
 '/repair-guides/garage-doors-and-home-energy-efficiency-2026-guide':'Garage Door Energy Efficiency Guide | Valiant Garage Door',
 '/videos/companycam/18976263':'End Plate & Hardware Inspection, San Ramon | Valiant',
 '/videos/companycam/18976484':'Door Operation Test After Spring Work, San Ramon | Valiant',
 '/videos/companycam/19084356':'Door Test After Temporary Repair, Pleasanton | Valiant',
 '/videos/companycam/19089326':'Cable & Bottom Fixture Inspection, Danville | Valiant',
 '/videos/companycam/19439666':'Cable & Bottom Fixture Inspection, Livermore | Valiant',
 '/videos/companycam/19843053':'Commercial Door Hardware, San Leandro | Valiant Garage Door',
 '/videos/companycam/20413021':'Door Opening Inspection, Pleasanton | Valiant Garage Door',
 '/videos/companycam/21962334':'Cable Drum Close-Up, Danville | Valiant Garage Door',
 '/videos/companycam/21962561':'Torsion Springs Close-Up, Danville | Valiant Garage Door',
 '/videos/companycam/21962867':'Roller in the Track Close-Up | Valiant Garage Door',
 '/videos/companycam/21963465':'Torsion Spring Assembly Close-Up | Valiant Garage Door',
 '/videos/companycam/21998887':'Frame Wood Damage, San Leandro | Valiant Garage Door',
 '/videos/companycam/22205600':'Roller & Hinge Installation, Fremont | Valiant Garage Door',
 '/videos/how-to/can-an-overtightened-opener-belt-cause-premature-failure':'Opener Belt Tension & Premature Failure | Valiant Garage Door',
 '/videos/how-to/garage-door-still-wont-close-after-sensor-alignment':'Sensor Alignment Troubleshooting | Valiant Garage Door',
 '/videos/how-to/how-do-duramaster-springs-reduce-rust-exposure':'DuraMaster Spring Rust Resistance | Valiant Garage Door',
 '/videos/how-to/how-do-professionals-change-garage-door-rollers-quickly':'Professional Roller Replacement | Valiant Garage Door',
 '/videos/how-to/how-do-professionals-release-tension-from-a-garage-door-spring':'Professional Spring Tension Release | Valiant Garage Door',
 '/videos/how-to/how-do-you-install-a-liftmaster-garage-door-wall-control':'LiftMaster Wall Control Installation | Valiant Garage Door',
 '/videos/how-to/how-do-you-repair-and-hide-garage-door-sensor-wiring':'Safety Sensor Wiring Repair | Valiant Garage Door',
 '/videos/how-to/how-does-a-professional-replace-a-broken-garage-door-spring':'Professional Broken Spring Replacement | Valiant Garage Door',
 '/videos/how-to/how-is-a-surewinder-used-for-garage-door-spring-service':'SureWinder Spring Service | Valiant Garage Door',
 '/videos/how-to/how-to-operate-commercial-garage-door-chain-hoist':'Commercial Chain Hoist Operation | Valiant Garage Door',
 '/videos/how-to/what-does-a-proper-garage-door-sensor-repair-look-like':'Garage Door Safety Sensor Repair | Valiant Garage Door',
 '/videos/how-to/what-does-professional-garage-door-maintenance-include':'Professional Door Maintenance | Valiant Garage Door'
};
const files = [...walk(PUBLIC),path.join(ROOT,'lib/blog-index.html')];
const pages = files.map(file=>({file,html:fs.readFileSync(file,'utf8'),route:routeFor(file)}));
const videos = pages.filter(p=>p.route.startsWith('/videos/') && eligible(p.html,p.route)).map(p=>({
  route:p.route, name:titleOf(p.html).replace(/\s*\|\s*Valiant(?: Garage Door)?$/,''),
  topic:(titleOf(p.html)+' '+p.route).toLowerCase()
}));
const videoGroups = new Map();
const group = (route,video) => {if(!pages.some(p=>p.route===route))return; if(!videoGroups.has(route))videoGroups.set(route,[]);videoGroups.get(route).push(video);};
const cityRoutes = {'pleasanton':'/garage-door-repair-pleasanton','dublin':'/garage-door-repair-dublin-ca','livermore':'/garage-door-repair-livermore','fremont':'/garage-door-repair-fremont','san ramon':'/garage-door-repair-san-ramon','danville':'/garage-door-repair-danville','san leandro':'/service-areas'};
for(const video of videos) {
  let route='/garage-door-repair';
  if(/spring|torsion|surewinder/.test(video.topic))route='/garage-door-spring-replacement';
  else if(/sensor/.test(video.topic))route='/safety-sensors';
  else if(/opener|liftmaster|wall control|belt/.test(video.topic))route='/garage-door-opener-repair';
  else if(/cable|drum/.test(video.topic))route='/garage-door-cable-repair';
  else if(/commercial|chain.hoist/.test(video.topic))route='/services/commercial';
  else if(/maintenance|lubricat/.test(video.topic))route='/services/garage-door-maintenance';
  group(route,video);
  for(const [city,cityRoute] of Object.entries(cityRoutes))if(video.topic.includes(city)||video.topic.includes(city.replaceAll(' ','-')))group(cityRoute,video);
}
const report={pagesInspected:pages.length,pagesWithBusiness:0,schemaPagesChanged:0,titlesChanged:[],descriptionsChanged:[],contextLinkPages:[],credentialPages:0};
for(const page of pages) {
  if (/^\/(?:listings-admin|authority-dashboard|settings|address-selection-hidden)(?:\/|$)/.test(page.route)) continue;
  let {html,route}=page;
  const before=html;
  const publicPage=eligible(html,route);
  if(publicPage) {
    // The architectural landing page owns its immersive navigation/footer.
    if(route==='/moenave-garage-doors')html=html.replace(/<body(?![^>]*data-chrome)[^>]*>/i,tag=>tag.replace('>',' data-chrome="off">'));
    if(conciseTitles[route])html=metadata(html,'title',conciseTitles[route]);
    if(route.startsWith('/portfolio/projects/')) {
      const h1=text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
      const [city,scope='Garage door project']=h1.split('·').map(s=>s.trim());
      const id=route.split('/').pop().slice(-5);
      const projectTitle=city+' '+scope.split(',')[0]+' · '+id;
      html=metadata(html,'title',projectTitle+(projectTitle.length<=48?' | Valiant Garage Door':' | Valiant'));
      const counts=text(html.match(/class="portfolio-intro"[^>]*>([\s\S]*?)<\/p>/)?.[1]||'');
      html=metadata(html,'description',city+' project '+id+': '+scope.split(',').slice(0,2).join(',')+'. '+counts+' from Valiant Garage Door.');
    }
    if(route==='/blog')html=metadata(html,'description','Read Valiant Garage Door articles on repair costs, homeowner questions, local projects and garage door care in Pleasanton and the East Bay.');
    if(route==='/repair-guides')html=metadata(html,'description','Explore garage door troubleshooting guides for broken springs, opener problems, cables, safety sensors and maintenance from Valiant Garage Door.');
    if(route==='/services') {
      // Put the page heading before the trust strip, then give service groups
      // an h2 and cards an h3 without changing their existing visual styling.
      const heading=html.match(/<h1 class="services-page-heading">[\s\S]*?<\/h1>/)?.[0];
      if(heading){html=html.replace(heading,'');html=html.replace(/<section class="trust-strip">/, '<div class="container">'+heading+'</div>\n<section class="trust-strip">');}
      html=html.replace(/<h3>(Built To Last|Rapid Response|Top Tier Service)<\/h3>/g,'<p class="trust-item-heading">$1</p>');
      if(!html.includes('id="service-options-title"'))html=html.replace('<div class="services-grid">','<h2 id="service-options-title" class="visually-hidden">Repair and installation services</h2>\n<div class="services-grid">');
    }
    if(route==='/nextdoor-emergency-repair') {
      html=html.replaceAll('Proof Before Proposition','Proof Before Proposal');
      html=html.replaceAll(SITE+'/nextdoor-emergency-repair/',SITE+'/nextdoor-emergency-repair');
      if(!html.includes('id="repair-visit-plan"'))html=html.replace('</main>',`<section class="proof" id="repair-visit-plan"><div><h2>What to expect from your repair visit</h2><p>Tell us whether the door is open, closed, crooked, or stuck partway, and whether you heard a loud bang or see a loose cable. Photos can help explain the issue before a visit. Keep people, pets, and vehicles clear of the opening, and stop using the opener when the door is damaged or unbalanced.</p><p>We inspect the door, springs, cables, tracks, rollers, and opener to identify the cause. You receive documented findings and clear repair options before approving work. After an approved repair, we check balance, travel, and safety operation. Dispatch timing depends on the route, technician availability, and required parts.</p><p><a href="/emergency-garage-door-repair">Emergency repair information</a> · <a href="/garage-door-repair-pleasanton">Pleasanton garage door service</a></p></div></section>\n</main>`);
      html=html.replace(/<button data-problem=/g,'<button type="button" data-problem=');
    }
    if(['/services','/garage-door-repair-pleasanton'].includes(route)&&!html.includes('id="urgent-repair-request"'))html=html.replace('</main>','<section class="geo-section" id="urgent-repair-request"><h2>Have a stuck or unsafe garage door?</h2><p><a href="/nextdoor-emergency-repair">Describe the problem and request urgent repair</a>, or <a href="tel:+19254094974">call (925) 409-4974</a>. Keep clear of a crooked door or damaged spring and cable system.</p></section>\n</main>');
    if(videoGroups.has(route)&&!html.includes('data-valiant-context-videos')) {
      const list=[...new Map(videoGroups.get(route).map(v=>[v.route,v])).values()];
      html=html.replace('</main>','<section class="geo-section valiant-context-videos" data-valiant-context-videos><h2>Documented garage door work</h2><p>These field videos show the components, inspections and service work behind our recommendations.</p><details><summary>View related repair and inspection videos</summary><ul>'+list.map(v=>'<li><a href="'+v.route+'">'+escape(v.name)+'</a></li>').join('')+'</ul></details></section>\n</main>');
      report.contextLinkPages.push({route,videos:list.length});
    }
    html=html.replace(/(<a[^>]*href="\/about-valentino-ramirez"[^>]*>About Valentino<\/a>)/g,'$1<a href="/credentials">License, Bonds &amp; Insurance</a>');
    if(route==='/site-map'&&!html.includes('data-credential-sitemap-link'))html=html.replace('</main>','<p data-credential-sitemap-link><a href="/credentials">License, certification, bonds &amp; insurance</a></p>\n</main>');
    if(route==='/site-map'&&!html.includes('data-emergency-request-sitemap-link'))html=html.replace('</main>','<p data-emergency-request-sitemap-link><a href="/nextdoor-emergency-repair">Request urgent garage door repair</a></p>\n</main>');
    html=addCredentialDetails(html);
    if(route==='/credentials')html=html.replace(/(<aside[^>]*data-valiant-credential-details[^>]*>\s*)<details>/,'$1<details open>');
    if(!html.includes('/js/global-chrome.'))html=html.replace('</body>','<script src="/js/global-chrome.js" defer></script>\n</body>');
    report.pagesWithBusiness++;
    report.credentialPages++;
  }
  if(/application\/ld\+json/i.test(html)||publicPage) {
    const normalized=normalizeHtmlSchema(html,{includeBusiness:publicPage});
    if(normalized!==html)report.schemaPagesChanged++;
    html=normalized;
  }
  html=html.replace(/\/js\/global-chrome(?:\.min)?\.js(?:\?[^"'\s<>]*)?/g,'/js/global-chrome.min.js?v='+VERSION);
  html=html.replace(/\/css\/global-chrome(?:\.min)?\.css(?:\?[^"'\s<>]*)?/g,'/css/global-chrome.min.css?v='+VERSION);
  if(titleOf(html)!==titleOf(before))report.titlesChanged.push(route);
  const desc=s=>s.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if(desc(html)!==desc(before))report.descriptionsChanged.push(route);
  if(html!==before)fs.writeFileSync(page.file,html);
}
const sitemap=path.join(PUBLIC,'sitemap-pages.xml');
let xml=fs.readFileSync(sitemap,'utf8');
for(const route of ['/credentials','/nextdoor-emergency-repair']) {
  if(!xml.includes('<loc>'+SITE+route+'</loc>'))xml=xml.replace('</urlset>','<url><loc>'+SITE+route+'</loc></url>\n</urlset>');
}
fs.writeFileSync(sitemap,xml);
console.log(JSON.stringify(report,null,2));
