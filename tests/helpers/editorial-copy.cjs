const {createHash}=require('node:crypto');
const {load}=require('cheerio');
const manifest=require('../../data/editorial-copy-20261025.json');
const normalize=value=>value.replace(/\s+/g,' ').trim();
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function mainDigest(html){const $=load(html);$('script,style,[data-valiant-credential-details],.valiant-process-reference,[data-valiant-related-projects],[data-valiant-related-guides],[data-valiant-related-static-guides],[data-valiant-seo-reference]').remove();return hash(normalize($('main').text()));}
function protectedContent(html){
 // Apply the existing credential compiler to both baseline and candidate; its
 // municipal-license link is generated, not an editorial navigation change.
 const {addCredentialDetails}=require('../../lib/blog-business-schema');
 const $=load(addCredentialDetails(html));return {
 h1:$('h1').toArray().map(e=>normalize($(e).text())),
 links:$('a[href]').toArray().map(e=>$(e).attr('href')).sort(),
 ids:$('[id]').toArray().map(e=>$(e).attr('id')).sort(),
 media:$('img,video,source').toArray().map(e=>[e.name,e.attribs]),
 metadata:$('title,meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"],link[rel="canonical"],meta[name="robots"]').toArray().map(e=>[e.name,e.attribs,$(e).text()]),
 prices:($('main').text().match(/\$[\d,.]+(?:[–-]\$?[\d,.]+)?/g)||[]).sort(),
 quotes:$('blockquote').toArray().map(e=>normalize($(e).text())),
 navigation:$('header,nav').toArray().map(e=>normalize($(e).text()))
};}
module.exports={manifest,normalize,hash,mainDigest,protectedContent};
