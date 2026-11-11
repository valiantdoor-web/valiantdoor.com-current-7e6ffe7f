const fs = require('node:fs');
const path = require('node:path');
const {addMeasuredImageDimensions} = require('../lib/image-dimensions');
const root = path.resolve(__dirname, '..');
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e =>
  e.isDirectory() ? walk(path.join(dir,e.name)) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []);
function run() {
  let changed = 0;
  for (const file of [...walk(path.join(root,'public')),path.join(root,'lib/blog-index.html')]) {
    const before = fs.readFileSync(file,'utf8');
    const after = addMeasuredImageDimensions(before);
    if (after !== before) { fs.writeFileSync(file,after); changed++; }
  }
  console.log(`Measured image dimensions refreshed in ${changed} pages/templates.`);
}
if (require.main === module) run();
module.exports = {run};
