// Build-time navigation for existing public projects. Does not import new media,
// expose private records, change URLs, or change the portfolio's project order.
const fs = require('node:fs');
const path = require('node:path');
const {load} = require('cheerio');
function refresh(root = path.resolve(__dirname, '..')) {
  const directory = path.join(root, 'public/portfolio/projects');
  const projects = fs.readdirSync(directory, {withFileTypes:true})
    .filter(e => e.isDirectory() && /^\d+$/.test(e.name) && fs.existsSync(path.join(directory,e.name,'index.html')))
    .map(e => {
      const file=path.join(directory,e.name,'index.html'), html=fs.readFileSync(file,'utf8'), $=load(html);
      return {id:e.name,file,html,title:$('title').text().replace(/\s*\|\s*Valiant Garage Door$/, '')};
    }).sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
  const escape = s => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  if (projects.length < 2) return 0;
  let changed=0;
  projects.forEach((project,index)=>{
    const adjacent=[...new Set([(index+projects.length-1)%projects.length,(index+1)%projects.length])].map(i=>projects[i]);
    const section=`<section class="portfolio-section" data-valiant-related-projects><h2>Explore more documented projects</h2><nav class="portfolio-links" aria-label="More documented projects">${adjacent.map(p=>`<a href="/portfolio/projects/${p.id}">${escape(p.title)}</a>`).join('')}</nav></section>`;
    const cleaned=project.html.replace(/<section\b[^>]*data-valiant-related-projects[^>]*>[\s\S]*?<\/section>/g,'');
    if ((cleaned.match(/<\/main>/g)||[]).length!==1) throw Error(`Expected one main in ${project.file}`);
    const after=cleaned.replace('</main>',section+'</main>');
    if(after!==project.html){fs.writeFileSync(project.file,after);changed++;}
  });
  return changed;
}
if(require.main===module)console.log(`Related-project navigation refreshed on ${refresh()} pages.`);
module.exports={refresh};
