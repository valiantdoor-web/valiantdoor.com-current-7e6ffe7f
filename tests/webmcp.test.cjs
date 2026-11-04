const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Ajv = require('ajv');

// The current draft exposes Document.modelContext, not Navigator.modelContext:
// https://webmachinelearning.github.io/webmcp/ (2 November 2026 draft).
// These are offline contract tests, NOT proof of native browser availability.
const root = path.resolve(__dirname, '..');
const files = ['public/js/webmcp.js', 'public/js/webmcp.min.js'];
const copy = value => JSON.parse(JSON.stringify(value));
const names = ['get_valiant_business_info', 'check_valiant_service_area', 'book_valiant_estimate', 'call_valiant', 'request_valiant_service'];
function load(file, options = {}) {
  const registered = [], effects = [], pending = [];
  const window = { location: {} };
  Object.defineProperty(window.location, 'href', {set(value) { effects.push(['navigate', value]); }});
  window.confirm = options.dialogMissing ? undefined : message => {
    effects.push(['confirm', message]);
    if (options.dialogThrows) throw new Error('Dialogs unavailable');
    return options.confirm === true;
  };
  window.open = (url, target) => {
    effects.push(['open', url, target]);
    if (options.popupBlocked) return null;
    const popup = {opener: 'original', location: {}};
    Object.defineProperty(popup.location, 'href', {set(value) { effects.push(['popupNavigate', value, popup.opener]); }});
    return popup;
  };
  const mc = {registerTool(tool) {
    if (options.rejectName === tool.name) {
      if (options.async) return Promise.reject(new Error('Registration rejected'));
      throw new Error('Registration rejected');
    }
    registered.push(tool);
    if (options.async) { const promise = Promise.resolve(); pending.push(promise); return promise; }
  }};
  const document = options.unsupported ? {} : {modelContext: mc};
  const context = vm.createContext({window, document, navigator: {}, fetch() { effects.push(['network']); throw new Error('Network forbidden'); }});
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const run = () => vm.runInContext(source, context, {filename: file});
  run();
  return {registered, effects, pending, window, run, tool: name => registered.find(t => t.name === name)};
}
for (const file of files) {
  test(`${file}: unsupported browser is a no-op, supported page registers once`, () => {
    const absent = load(file, {unsupported: true});
    assert.equal(absent.window.__valiantWebMCP, undefined);
    assert.equal(absent.registered.length, 0);
    assert.deepEqual(absent.effects, []);
    const page = load(file);
    page.run();
    assert.deepEqual(page.registered.map(t => t.name), names);
    assert.deepEqual(copy(page.window.__valiantWebMCP), {registered: names, failed: []});
    assert.deepEqual(page.effects, []);
  });
  test(`${file}: all five input schemas are valid JSON Schema and bounded`, () => {
    const ajv = new Ajv({strict: true});
    for (const tool of load(file).registered) {
      const schema = copy(tool.inputSchema);
      assert.match(tool.name, /^[A-Za-z0-9_.-]{1,128}$/);
      assert.ok(tool.description.trim());
      assert.equal(schema.type, 'object');
      assert.equal(schema.additionalProperties, false);
      assert.equal(ajv.validateSchema(schema), true, JSON.stringify(ajv.errors));
      const validate = ajv.compile(schema);
      assert.equal(typeof validate, 'function');
      for (const rule of Object.values(schema.properties)) {
        if (rule.type === 'string' && !rule.enum) assert.ok(rule.minLength >= 1 && rule.maxLength <= 500);
      }
      assert.equal(typeof tool.annotations.readOnlyHint, 'boolean');
      assert.equal(typeof tool.annotations.consequentialHint, 'boolean');
    }
  });
  test(`${file}: invalid arguments fail before any dialog, navigation or network`, () => {
    const page = load(file, {confirm: true});
    for (const tool of page.registered) {
      for (const args of [null, [], 3, 'text', {unexpected: true}]) assert.ok(tool.execute(args).error, tool.name);
    }
    const area = page.tool('check_valiant_service_area');
    for (const args of [{}, {city: 1}, {city: ''}, {city: ' '}, {city: 'x'.repeat(101)}]) assert.ok(area.execute(args).error);
    const service = page.tool('request_valiant_service');
    for (const args of [{}, {issue: 1}, {issue: ' '}, {issue: 'x'.repeat(501)}, {issue: 'spring', city: 12}, {issue: 'spring', urgency: 'now'}, {issue: 'spring', ignored: 'no'}]) assert.ok(service.execute(args).error);
    assert.deepEqual(page.effects, []);
  });
  test(`${file}: aborted execution and declined/unavailable dialogs have zero contact effects`, () => {
    for (const opts of [{}, {dialogMissing: true}, {dialogThrows: true}]) {
      const page = load(file, opts);
      for (const name of ['book_valiant_estimate', 'call_valiant']) assert.equal(page.tool(name).execute({}).status, 'cancelled');
      assert.equal(page.effects.some(([kind]) => kind !== 'confirm'), false);
    }
    const page = load(file, {confirm: true});
    for (const tool of page.registered) {
      const args = tool.name === 'check_valiant_service_area' ? {city: 'Pleasanton'} : tool.name === 'request_valiant_service' ? {issue: 'spring'} : {};
      assert.equal(tool.execute(args, {signal: {aborted: true}}).error, 'Operation cancelled.');
    }
    assert.deepEqual(page.effects, []);
  });
  test(`${file}: read-only guidance never reports a submitted request, booking or guaranteed dispatch`, () => {
    const page = load(file);
    const info = page.tool('get_valiant_business_info').execute({}).content[0].text;
    assert.match(info, /staffed storefront available 24\/7/);
    assert.match(info, /\$100 service charge/);
    assert.match(info, /https:\/\/www.valiantdoor.com\/warranty/);
    assert.doesNotMatch(info, /34 reviews|lifetime warranty|Request noted/i);
    assert.match(page.tool('check_valiant_service_area').execute({city: 'Pleasanton'}).content[0].text, /subject to technician, route, and parts availability/);
    const guidance = copy(page.tool('request_valiant_service').execute({issue: ' Broken spring ', city: 'Pleasanton', urgency: 'emergency'}));
    assert.equal(guidance.status, 'guidance_only');
    assert.equal(guidance.submitted, false);
    assert.equal(guidance.booked, false);
    assert.equal(guidance.issue, 'Broken spring');
    assert.match(guidance.nextStep, /not guaranteed/);
    assert.deepEqual(page.effects, []);
  });
  test(`${file}: confirmed handoffs distinguish page/dialer opening from completion`, () => {
    const page = load(file, {confirm: true});
    const booking = page.tool('book_valiant_estimate').execute({});
    assert.equal(booking.status, 'booking_page_opened');
    assert.equal(booking.booked, false);
    const nav = page.effects.find(([kind]) => kind === 'popupNavigate');
    assert.match(nav[1], /^https:\/\/book\.housecallpro\.com\/book\//);
    assert.equal(nav[2], null, 'new page must not retain opener');
    const call = page.tool('call_valiant').execute({});
    assert.equal(call.status, 'dialer_handoff_requested');
    assert.equal(call.connected, false);
    assert.ok(page.effects.some(([kind, url]) => kind === 'navigate' && url === 'tel:9254094974'));
    const blocked = load(file, {confirm: true, popupBlocked: true}).tool('book_valiant_estimate').execute({});
    assert.equal(blocked.status, 'open_not_confirmed');
    assert.equal(blocked.booked, false);
  });
  test(`${file}: async registration and individual failures are tracked without throwing`, async () => {
    const page = load(file, {async: true, rejectName: 'call_valiant'});
    await Promise.all(page.pending);
    await Promise.resolve();
    assert.deepEqual(copy(page.window.__valiantWebMCP.registered), names.filter(n => n !== 'call_valiant'));
    assert.deepEqual(copy(page.window.__valiantWebMCP.failed), ['call_valiant']);
    const sync = load(file, {rejectName: 'call_valiant'});
    assert.deepEqual(copy(sync.window.__valiantWebMCP.failed), ['call_valiant']);
  });
}
test('served minified tools have identical schemas, annotations, descriptions and read-only behavior', () => {
  const source = load(files[0]), minified = load(files[1]);
  const contract = page => page.registered.map(({name, description, inputSchema, annotations}) => copy({name, description, inputSchema, annotations}));
  assert.deepEqual(contract(minified), contract(source));
  for (const [name, args] of [['get_valiant_business_info', {}], ['check_valiant_service_area', {city: 'Dublin'}], ['request_valiant_service', {issue: 'Opener repair'}]]) {
    assert.deepEqual(copy(minified.tool(name).execute(args)), copy(source.tool(name).execute(args)));
  }
});
