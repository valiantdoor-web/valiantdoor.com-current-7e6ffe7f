// Shared by static website maintenance and the live blog renderer. One company
// definition prevents imported articles or old page-intent stubs from creating
// another incomplete LocalBusiness entity.
const fs = require('node:fs');
const path = require('node:path');
const profile = require('./blog-business-profile.json');
const BUSINESS_ID = profile['@id'];
const WEBSITE_ID = 'https://www.valiantdoor.com/#website';
const clone = value => JSON.parse(JSON.stringify(value));
const typeList = node => Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
function isOwnBusiness(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const name = String(node.name || '').toLowerCase();
  return node['@id'] === BUSINESS_ID && !!node['@type'] ||
    /valiant(?: garage door)?/.test(name) && typeList(node).some(t =>
      ['LocalBusiness', 'HomeAndConstructionBusiness', 'Organization', 'GarageDoorService'].includes(t));
}
function cleanReferences(node) {
  if (Array.isArray(node)) return node.map(cleanReferences);
  if (!node || typeof node !== 'object') return node;
  if (isOwnBusiness(node)) return {'@id': BUSINESS_ID};
  return Object.fromEntries(Object.entries(node).map(([key, value]) => {
    // Google image metadata expects an explicitly typed Person/Organization.
    // Keep our company identity, but do not collapse the creator into a bare
    // LocalBusiness reference. Never relabel third-party image creators.
    const ownImageCreator = key === 'creator' && typeList(node).includes('ImageObject') &&
      value && !Array.isArray(value) && (value['@id'] === BUSINESS_ID || isOwnBusiness(value));
    return [key, ownImageCreator
      ? {'@type': 'Organization', '@id': BUSINESS_ID, name: profile.legalName}
      : cleanReferences(value)];
  }));
}
function members(data) {
  if (Array.isArray(data)) return data.flatMap(members);
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data['@graph'])) return data['@graph'].flatMap(members);
  const node = {...data};
  delete node['@context'];
  return [node];
}
function normalizeGraph(blocks, {includeBusiness = true} = {}) {
  const nodes = blocks.flatMap(members);
  const business = clone(profile);
  const offers = [];
  for (const node of nodes.filter(isOwnBusiness)) {
    // Preserve page-specific offers, not stale hours. The owner confirmed 24/7
    // storefront/phone hours on 2026-10-25; maintained hours have one source.
    for (const key of ['priceRange', 'hasOfferCatalog']) {
      if (node[key] !== undefined) business[key] = clone(node[key]);
    }
    if (node.makesOffer) offers.push(...[node.makesOffer].flat());
  }
  if (offers.length) business.makesOffer = [...new Map(offers.map(o => [JSON.stringify(o), o])).values()];
  const remaining = nodes.filter(node => !isOwnBusiness(node)).map(cleanReferences);
  if (includeBusiness) {
    remaining.unshift(business);
    if (!remaining.some(node => node['@id'] === WEBSITE_ID)) remaining.push({
      '@type': 'WebSite', '@id': WEBSITE_ID, url: profile.url,
      name: profile.name, publisher: {'@id': BUSINESS_ID}
    });
  }
  return {'@context': 'https://schema.org', '@graph': remaining};
}
const LD = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
function normalizeHtmlSchema(html, options) {
  const blocks = [];
  const without = html.replace(LD, (_, body) => {blocks.push(JSON.parse(body)); return '';});
  const graph = normalizeGraph(blocks, options);
  if (!graph['@graph'].length) return without;
  const script = '<script type="application/ld+json" data-valiant-business-graph>' +
    JSON.stringify(graph).replace(/</g, '\\u003c') + '</script>';
  return without.replace(/<\/head>/i, script + '\n</head>');
}
function addCredentialDetails(html) {
  const markup = fs.readFileSync(path.join(__dirname, 'blog-credential-details.html'), 'utf8').trimEnd();
  const style = '<link rel="stylesheet" href="/css/credentials.min.css?v=20261012">';
  if (!html.includes('/css/credentials.min.css')) html = html.replace(/<\/head>/i, style + '\n</head>');
  if (html.includes('data-valiant-credential-details')) {
    // Refresh published credentials when the maintained facts change.
    return html.replace(/<aside\b[^>]*\bdata-valiant-credential-details\b[^>]*>[\s\S]*?<\/aside>/gi,
      previous => /<details\b[^>]*\bopen\b/i.test(previous) ? markup.replace('<details>', '<details open>') : markup);
  }
  if (/<\/main>/i.test(html)) return html.replace(/<\/main>/i, '</main>\n' + markup);
  return html.replace(/<\/body>/i, markup + '\n</body>');
}
module.exports = {profile, BUSINESS_ID, normalizeGraph, normalizeHtmlSchema, addCredentialDetails};
