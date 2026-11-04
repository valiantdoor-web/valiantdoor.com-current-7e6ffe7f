const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const root = path.resolve(__dirname, '..');
const fixtures = path.join(__dirname, 'fixtures/ard-schema');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const primaryPath = path.join(root, 'public/.well-known/ard.json');
const legacyPath = path.join(root, 'public/.well-known/ai-catalog.json');
const manifest = readJson(primaryPath);
const catalogSchema = readJson(path.join(fixtures, 'ai-catalog.schema.json'));
const entrySchema = readJson(path.join(fixtures, 'ard-entry.schema.json'));
// Upstream uses `required` inside composed branches; its schemas do not repeat
// `type`/`properties` in every branch. Keep the exact upstream bytes rather than
// modifying the schema to satisfy Ajv's optional strict-authoring lint rules.
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(entrySchema);
const validateCatalog = ajv.compile(catalogSchema);
const validateManifest = ajv.compile({ $ref: `${entrySchema.$id}#/$defs/ArdManifest` });
const clone = value => JSON.parse(JSON.stringify(value));

function assertValid(validator, value) {
  assert.equal(validator(value), true, JSON.stringify(validator.errors));
}

test('pinned ARD schemas and license retain upstream byte hashes', () => {
  const provenance = readJson(path.join(fixtures, 'provenance.json'));
  assert.equal(provenance.upstream, 'https://github.com/ards-project/ard-spec');
  assert.equal(provenance.commit, 'f073b1ea9b01a5f068d0b0986426f2ea49fa30b2');
  assert.deepEqual(Object.keys(provenance.files).sort(), ['LICENSE', 'ai-catalog.schema.json', 'ard-entry.schema.json']);
  for (const [file, expected] of Object.entries(provenance.files)) {
    const digest = crypto.createHash('sha256').update(fs.readFileSync(path.join(fixtures, file))).digest('hex');
    assert.equal(digest, expected, file);
  }
});

test('normative and predecessor discovery manifests are identical and validate against both schemas', () => {
  assert.equal(fs.readFileSync(primaryPath, 'utf8'), fs.readFileSync(legacyPath, 'utf8'));
  assertValid(validateManifest, manifest);
  assertValid(validateCatalog, manifest);
});

test('schema validation rejects malformed identifiers, missing entries and ambiguous URL/data payloads', () => {
  for (const change of [
    value => { delete value.entries; },
    value => { delete value.entries[0].identifier; },
    value => { value.entries[0].identifier = 'valiant-public-facts'; },
    value => { value.entries[0].url = 'not a URI'; },
    value => { value.entries[0].data = {}; },
    value => { delete value.entries[0].url; }
  ]) {
    const invalid = clone(manifest); change(invalid);
    assert.equal(validateManifest(invalid), false, 'ARD schema must reject malformed manifest');
    assert.equal(validateCatalog(invalid), false, 'catalog schema must reject malformed manifest');
  }
});

test('catalog advertises exactly the existing canonical read-only OpenAPI resource', () => {
  assert.equal(manifest.entries.length, 1);
  const entry = manifest.entries[0];
  assert.equal(entry.identifier, 'urn:air:www.valiantdoor.com:api:public-facts');
  assert.equal(entry.url, 'https://www.valiantdoor.com/openapi.json');
  assert.equal(entry.type, 'application/vnd.oai.openapi+json');
  assert.deepEqual(entry.capabilities, ['getValiantAgentFacts']);
  assert.ok(entry.representativeQueries.length >= 2 && entry.representativeQueries.length <= 5);
  assert.equal(new Set(manifest.entries.map(item => item.identifier)).size, manifest.entries.length);
  assert.equal(new URL(entry.url).protocol, 'https:');
  assert.equal(new URL(entry.url).hostname, 'www.valiantdoor.com');
  assert.equal('data' in entry, false);
  assert.equal('trustManifest' in entry, false, 'do not invent attestations or signatures');
  const api = readJson(path.join(root, 'public/openapi.json'));
  assert.equal(api.openapi, '3.1.0');
  assert.deepEqual(api.servers, [{ url: 'https://www.valiantdoor.com' }]);
  assert.deepEqual(Object.keys(api.paths), ['/api/valiant-agent']);
  assert.deepEqual(Object.keys(api.paths['/api/valiant-agent']), ['get']);
  assert.equal(api.paths['/api/valiant-agent'].get.operationId, entry.capabilities[0]);
  assert.match(entry.description, /does not submit service requests, book appointments, place calls/);
});

test('documented GET topics return matching response-schema facts without provider writes', async () => {
  const api = readJson(path.join(root, 'public/openapi.json'));
  const operation = api.paths['/api/valiant-agent'].get;
  const topics = operation.parameters.find(parameter => parameter.name === 'topic').schema.enum;
  const responseSchema = operation.responses['200'].content['application/json'].schema;
  const validateResponse = ajv.compile(responseSchema);
  const handler = require('../api/valiant-agent.js');
  const originalFetch = globalThis.fetch;
  // Any unexpected provider fetch fails this test; only GET is invoked, never
  // the separately authenticated POST/admin branch or a real customer form.
  globalThis.fetch = () => { throw new Error('Provider fetch forbidden for public GET facts'); };
  try {
    for (const topic of topics) {
      const headers = {};
      let result;
      const response = { setHeader(name, value) { headers[name] = value; }, end(value) { result = JSON.parse(value); } };
      await handler({ method: 'GET', url: `/api/valiant-agent?topic=${encodeURIComponent(topic)}` }, response);
      assert.equal(response.statusCode, 200, topic);
      assert.match(headers['Content-Type'], /^application\/json/);
      assertValid(validateResponse, result);
      assert.equal(result.ok, true);
      assert.equal(result.topic, topic);
      assert.deepEqual(result.availableTopics, topics);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
