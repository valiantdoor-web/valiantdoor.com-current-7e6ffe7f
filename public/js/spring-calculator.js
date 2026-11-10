(function () {
  'use strict';
  const INSTALLATION = Object.freeze({ 1: 159, 2: 189, 4: 250 });
  const WIRE_SIZES = Object.freeze(['.207', '.218', '.225', '.234', '.243', '.250', '.262', '.273', '.283', '.295', '.306', '.319', '.331', '.343', '.362', '.375']);
  const SPRINGS = Object.freeze({
    endurance: { name: 'Valiant Endurance', base: 99, warranty: 5, finish: 'standard', baseSpec: '.207 × 22.5 / 2"' },
    pro: { name: 'Valiant Endurance Pro', base: 129, warranty: 5, finish: 'duramaster', baseSpec: '.207 × 26 / 1.75B' },
    max: { name: 'Valiant Endurance Max', base: 149, warranty: 10, finish: 'endurance', baseSpec: '.207 × 31 / 1.75"' }
  });
  const URGENCY = ['Scheduled daytime', 'Priority daytime request', 'After hours · 7 PM or later'];
  const SERVICES = Object.freeze({
    springs: { name: 'Spring replacement' },
    hilift: { name: 'Hi-lift rebuild / conversion', parts: 459 },
    wayne: { name: 'Wayne Dalton TorqueMaster conversion' },
    rebuild: { name: 'Complete torsion rebuild' }
  });
  const DOORS = Object.freeze({
    steel25: { category: 'noninsulated', name: '25-gauge steel', size: '.207' },
    steel24: { category: 'noninsulated', name: '24-gauge steel', size: '.218' },
    insulated138: { category: 'insulated', name: '1 3/8-inch insulated', size: '.225' },
    insulated2: { category: 'insulated', name: '2-inch insulated', size: '.234' },
    wood: { category: 'wood', name: 'Wood door', size: '.250' },
    backedwood: { category: 'wood', name: 'Wood door with backing', size: '.262' },
    carriage234: { category: 'carriage', name: 'Carriage · four .234 springs', size: '.234', count: 4 },
    carriage250: { category: 'carriage', name: 'Carriage · four .250 springs', size: '.250', count: 4 },
    fullview: { category: 'fullview', name: 'Full-view · four .218 springs', size: '.218', count: 4 }
  });
  function calculateSpringEstimate(input) {
    const tier = Object.hasOwn(SPRINGS, input.tier) ? input.tier : 'endurance';
    const spring = SPRINGS[tier];
    const profile = Object.hasOwn(DOORS, input.profile) ? input.profile : 'steel25';
    const door = DOORS[profile];
    const count = door.count || ([1, 2, 4].includes(Number(input.count)) ? Number(input.count) : input.door === 'single' ? 1 : 2);
    const urgency = [0, 1, 2].includes(Number(input.urgency)) ? Number(input.urgency) : 0;
    const sizeStep = WIRE_SIZES.indexOf(door.size);
    const unitPrice = spring.base + sizeStep * 10;
    const parts = unitPrice * count;
    const installation = INSTALLATION[count];
    const afterHours = urgency === 2 ? 99 : 0;
    const service = Object.hasOwn(SERVICES, input.service) ? input.service : 'springs';
    const packageParts = count === 4 ? null : service === 'wayne' ? ({ 1: 549, 2: 649 }[count] ?? null) : service === 'rebuild' ? ({ 1: 459, 2: 549 }[count] ?? null) : SERVICES[service].parts;
    const selectedParts = service === 'springs' ? parts : packageParts;
    const selectedLabor = service === 'springs' ? installation : 250;
    return { service, serviceName: SERVICES[service].name, needsQuote: selectedParts === null, tier, profile, construction: door.name, category: door.category, name: spring.name, warranty: spring.warranty, baseSpec: spring.baseSpec, size: door.size, sizeStep, unitPrice, parts: selectedParts, installation: selectedLabor, afterHours, total: selectedParts === null ? null : selectedParts + selectedLabor + afterHours, count, urgency };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { calculateSpringEstimate, WIRE_SIZES, DOORS };
  if (typeof document === 'undefined') return;
  const root = document.querySelector('[data-spring-calculator]');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const money = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  let doorPosition = 0, doorTarget = 0, motionFrame = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const COMPONENTS = {
    springs: 'Torsion springs counterbalance the door. Your selected package, wire size and spring count update the system above.',
    cables: 'Lift cables travel around the drums as the door moves. The technician checks cable condition, routing and tension during service.',
    tracks: 'Rollers guide the sectional door into its overhead tracks. Track alignment and a balanced door help the system move smoothly.'
  };
  function applyDoorPosition() {
    const lift = doorPosition * 258;
    $('[data-sc-door-leaf]').setAttribute('transform', 'translate(0 ' + -lift + ')');
    root.querySelectorAll('[data-sc-cable]').forEach(el => el.setAttribute('d', 'M' + el.dataset.x + ' 131V' + Math.max(143, 396 - lift)));
    root.querySelectorAll('[data-sc-rotation]').forEach(el => {
      el.setAttribute('transform', 'translate(0 ' + (Math.sin(doorPosition * Math.PI * 14) * 11).toFixed(2) + ')');
      el.setAttribute('opacity', String(.35 + .65 * Math.abs(Math.cos(doorPosition * Math.PI * 14))));
    });
    $('#sc-position').value = String(Math.round(doorPosition * 100));
    $('#sc-position').style.setProperty('--sc-fill', (doorPosition * 100) + '%');
    const status = doorPosition < .005 ? 'Closed' : doorPosition > .995 ? 'Open' : Math.round(doorPosition * 100) + '% open';
    $('[data-sc-position]').textContent = status;
    $('#sc-position').setAttribute('aria-valuetext', status);
    $('[data-sc-scene]').dataset.position = doorPosition.toFixed(3);
    root.querySelectorAll('[data-sc-operate]').forEach(button => {
      const closing = doorTarget > .5;
      button.setAttribute('aria-label', closing ? 'Close the illustrated garage door' : 'Open the illustrated garage door');
      button.textContent = button.classList.contains('sc-door-touch') ? (closing ? 'Tap to close' : 'Tap the door to open') : (closing ? 'Close door' : 'Open door');
    });
  }
  function moveDoor(target) {
    cancelAnimationFrame(motionFrame);
    doorTarget = target;
    if (reducedMotion.matches) { doorPosition = target; applyDoorPosition(); return; }
    const start = doorPosition, started = performance.now(), duration = Math.max(180, Math.abs(target - start) * 1900);
    function step(now) {
      const t = Math.min(1, (now - started) / duration), ease = t * t * (3 - 2 * t);
      doorPosition = start + (target - start) * ease;
      applyDoorPosition();
      if (t < 1) motionFrame = requestAnimationFrame(step);
    }
    motionFrame = requestAnimationFrame(step);
  }
  function coil(x, y, length, finish, mirrored) {
    const turns = Math.floor(length / 3.6);
    const wire = Array.from({ length: turns }, (_, i) => '<ellipse cx="' + (x + 4 + i * (length - 8) / (turns - 1)).toFixed(1) + '" cy="' + y + '" rx="3.6" ry="15.5" fill="none" stroke="url(#sc-coil-' + finish + ')" stroke-width="2.6"/>').join('');
    const fixed = mirrored ? x + length : x;
    const winding = mirrored ? x : x + length;
    return '<g class="sc-spring" data-sc-inspect="springs"><rect x="' + x + '" y="' + (y - 13) + '" width="' + length + '" height="26" rx="10" fill="#0d0f10"/>' + wire + '<rect data-sc-rotation x="' + (x + length / 2) + '" y="110" width="4" height="3" rx="1" fill="#e4c27e"/>' +
      '<path d="M' + (fixed - 7) + ' ' + (y - 11) + 'h14v22h-14z" fill="url(#sc-metal)"/><rect x="' + (winding - 10) + '" y="' + (y - 11) + '" width="20" height="22" rx="3" fill="url(#sc-metal)"/><ellipse cx="' + winding + '" cy="' + y + '" rx="5.5" ry="13" fill="#33383b" stroke="#8d9292"/><circle cx="' + winding + '" cy="' + (y - 7) + '" r="2" fill="' + (mirrored ? '#903a30' : '#313336') + '"/><circle cx="' + winding + '" cy="' + (y + 7) + '" r="2" fill="#121516"/></g>';
  }
  function diagram(state) {
    const doubleDoor = state.door === 'double';
    const finish = SPRINGS[state.tier].finish;
    const profile = DOORS[state.profile];
    const woodDoor = ['wood', 'carriage'].includes(profile.category);
    const glassDoor = profile.category === 'fullview';
    const width = doubleDoor ? 610 : 380, left = (900 - width) / 2, right = left + width;
    const panelColumns = doubleDoor ? 4 : 2, panelWidth = (width - 30) / panelColumns;
    let panels = '', hinges = '';
    for (let row = 0; row < 4; row++) {
      const y = 153 + row * 62;
      panels += '<path d="M' + left + ' ' + (y + 56) + 'h' + width + '" stroke="#44494b" stroke-width="2"/><path d="M' + left + ' ' + (y + 58) + 'h' + width + '" stroke="#bfc0b5" stroke-opacity=".32"/>';
      for (let col = 0; col < panelColumns; col++) {
        const x = left + 15 + col * panelWidth;
        panels += '<rect x="' + (x + 8) + '" y="' + (y + 8) + '" width="' + (panelWidth - 16) + '" height="40" rx="3" fill="' + (glassDoor ? 'url(#sc-glass)' : 'url(#sc-inset)') + '" stroke="' + (glassDoor ? '#c4d0d3' : '#93978e') + '" stroke-opacity=".5"/><path d="M' + (x + 14) + ' ' + (y + 43) + 'v-28h' + (panelWidth - 28) + '" fill="none" stroke="#eeeeDF" stroke-opacity=".28"/>';
        if (woodDoor) panels += '<path d="M' + (x + 14) + ' ' + (y + 22) + 'q' + (panelWidth / 3) + ' -4 ' + (panelWidth - 29) + ' 2m-' + (panelWidth - 29) + ' 10q' + (panelWidth / 3) + ' 4 ' + (panelWidth - 29) + ' -1" stroke="#4c301c" stroke-opacity=".3" fill="none"/>';
        if (glassDoor) panels += '<path d="m' + (x + 12) + ' ' + (y + 12) + ' ' + (panelWidth - 30) + ' 31m-25-32 25 18" stroke="#d0e2e7" stroke-opacity=".2" stroke-width="3"/>';
      }
      if (row < 3) for (let h = 0; h <= panelColumns; h++) {
        const x = left + (h === 0 ? 8 : h === panelColumns ? width - 8 : width * h / panelColumns);
        hinges += '<g transform="translate(' + x + ',' + (y + 57) + ')"><rect x="-5" y="-9" width="10" height="18" rx="1.5" fill="url(#sc-metal)" stroke="#555b5b" stroke-width=".7"/><rect x="-7" y="-2" width="14" height="4" rx="2" fill="#9b9e9b"/><circle cy="-6" r="1" fill="#353a3a"/><circle cy="6" r="1" fill="#353a3a"/></g>';
      }
    }
    const shaftY = 112, mid = 450, coilLength = doubleDoor ? 181 : 104;
    const shortCoil = doubleDoor ? 92 : 51;
    const springs = state.count === 4
      ? [-2, -1, 0, 1].map((n, i) => coil(mid + (n < 0 ? n * (shortCoil + 16) - 12 : n * (shortCoil + 16) + 20), shaftY, shortCoil, finish, i < 2)).join('')
      : state.count === 2
        ? coil(mid - coilLength - 18, shaftY, coilLength, finish, true) + coil(mid + 18, shaftY, coilLength, finish, false)
        : coil(mid - coilLength * 1.18 - 18, shaftY, coilLength * 1.18, finish, true);
    const drum = x => '<g data-sc-inspect="cables"><path d="M' + (x - 16) + ' 93h32v38h-32z" fill="url(#sc-metal)" stroke="#4c5355"/>' + [0, 1, 2, 3, 4].map(i => '<ellipse cx="' + (x - 12 + i * 6) + '" cy="112" rx="4" ry="21" fill="none" stroke="' + (i % 2 ? '#9b9e9b' : '#424b4f') + '" stroke-width="2.4"/>').join('') + '<rect data-sc-rotation x="' + (x - 12) + '" y="110" width="24" height="3" rx="1" fill="#e4c27e"/><rect x="' + (x - 5) + '" y="107" width="10" height="10" rx="2" fill="#656e70"/></g>';
    return '<svg viewBox="0 0 900 475" role="img" aria-label="Illustration of a ' + (doubleDoor ? 'double-car' : 'single-car') + ' ' + profile.name + ' garage door with ' + state.count + ' torsion spring' + (state.count === 1 ? '' : 's') + ', cable drums, lift cables, hinges and steel tracks"><defs>' +
      '<clipPath id="sc-opening"><rect x="' + (left - 10) + '" y="145" width="' + (width + 20) + '" height="265"/></clipPath><linearGradient id="sc-outside" x2="0" y2="1"><stop stop-color="#8ca5aa"/><stop offset=".58" stop-color="#ccd0bd"/><stop offset=".59" stop-color="#717a70"/><stop offset="1" stop-color="#444d4a"/></linearGradient><linearGradient id="sc-wall" x2="0" y2="1"><stop stop-color="#353638"/><stop offset=".65" stop-color="#232527"/><stop offset="1" stop-color="#1a1c1d"/></linearGradient>' +
      '<linearGradient id="sc-door" x2=".1" y2="1"><stop stop-color="' + (woodDoor ? '#ac855a' : glassDoor ? '#9eabad' : '#acb0a7') + '"/><stop offset=".4" stop-color="' + (woodDoor ? '#8b6541' : glassDoor ? '#6b7d82' : '#858d85') + '"/><stop offset="1" stop-color="' + (woodDoor ? '#5e412a' : '#6b746e') + '"/></linearGradient>' +
      '<linearGradient id="sc-inset" x2="0" y2="1"><stop stop-color="' + (woodDoor ? '#795235' : '#747e77') + '"/><stop offset=".1" stop-color="' + (woodDoor ? '#b08857' : '#9ea59b') + '"/><stop offset=".8" stop-color="' + (woodDoor ? '#987146' : '#929a90') + '"/><stop offset="1" stop-color="' + (woodDoor ? '#69472b' : '#686f69') + '"/></linearGradient>' +
      '<linearGradient id="sc-glass" x2=".8" y2="1"><stop stop-color="#799299"/><stop offset=".4" stop-color="#3b5862"/><stop offset="1" stop-color="#263c44"/></linearGradient>' +
      '<linearGradient id="sc-metal" x2="0" y2="1"><stop stop-color="#d4d6d0"/><stop offset=".18" stop-color="#9b9f9b"/><stop offset=".4" stop-color="#50585a"/><stop offset=".56" stop-color="#bbc0b9"/><stop offset=".7" stop-color="#747d7e"/><stop offset="1" stop-color="#454c50"/></linearGradient>' +
      '<linearGradient id="sc-coil-standard" x2="0" y2="1"><stop stop-color="#777f82"/><stop offset=".18" stop-color="#c0c4c1"/><stop offset=".35" stop-color="#424b4d"/><stop offset=".65" stop-color="#272c2e"/><stop offset="1" stop-color="#7c8688"/></linearGradient>' +
      '<linearGradient id="sc-coil-duramaster" x2="0" y2="1"><stop stop-color="#656b6b"/><stop offset=".18" stop-color="#969e9a"/><stop offset=".4" stop-color="#202628"/><stop offset=".8" stop-color="#151a1b"/><stop offset="1" stop-color="#616a67"/></linearGradient>' +
      '<linearGradient id="sc-coil-endurance" x2="0" y2="1"><stop stop-color="#9a8a66"/><stop offset=".18" stop-color="#d1bd85"/><stop offset=".4" stop-color="#49483a"/><stop offset=".8" stop-color="#282c29"/><stop offset="1" stop-color="#8c8865"/></linearGradient>' +
      '<radialGradient id="sc-light"><stop stop-color="#e9d2a0" stop-opacity=".11"/><stop offset="1" stop-color="#dfcda5" stop-opacity="0"/></radialGradient>' +
      '<filter id="sc-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-opacity=".45"/></filter>' +
      '<filter id="sc-grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".035"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter></defs>' +
      '<rect width="900" height="475" fill="url(#sc-wall)"/><path d="M0 74h900M0 288h900M120 0v408M782 0v408" stroke="#aaa" stroke-opacity=".045"/><ellipse cx="450" cy="50" rx="430" ry="280" fill="url(#sc-light)"/><path d="M0 412h900v63H0z" fill="#1a1c1d"/><path d="M0 412h900" stroke="#51504a" stroke-opacity=".4"/><ellipse cx="450" cy="420" rx="' + (width / 2 + 25) + '" ry="11" fill="#080b0c" opacity=".7"/>' +
      '<g data-sc-inspect="tracks"><path d="M' + (left - 17) + ' 408V161q0-36 25-55l45-30M' + (right + 17) + ' 408V161q0-36-25-55l-45-30" fill="none" stroke="#8d9392" stroke-width="7"/><path d="M' + (left - 17) + ' 408V161q0-36 25-55l45-30M' + (right + 17) + ' 408V161q0-36-25-55l-45-30" fill="none" stroke="#d4d8d0" stroke-opacity=".45" stroke-width="1.4"/></g>' +
      '<rect x="' + (left - 5) + '" y="143" width="' + (width + 10) + '" height="267" rx="3" fill="#0e1213" filter="url(#sc-shadow)"/><g clip-path="url(#sc-opening)"><rect x="' + left + '" y="150" width="' + width + '" height="258" fill="url(#sc-outside)"/><path d="M' + left + ' 300q70-45 150-9t160-7t180 6t150-5v35H' + left + 'z" fill="#394b40" opacity=".75"/><path d="M' + (left + width * .3) + ' 408l' + (width * .16) + '-94h' + (width * .08) + 'l' + (width * .16) + ' 94" fill="#a8aaa0" opacity=".4"/><g data-sc-door-leaf><g filter="url(#sc-grain)"><rect x="' + left + '" y="150" width="' + width + '" height="250" rx="2" fill="url(#sc-door)"/>' + panels + hinges + '</g>' +
      '<rect x="' + left + '" y="398" width="' + width + '" height="10" fill="#131817"/><rect x="438" y="351" width="24" height="6" rx="3" fill="#262e2b" stroke="#adb2a7" stroke-width="1"/>' + [left + 8, right - 8].map(x => '<path d="M' + (x - 7) + ' 390h14v13h-14z" fill="url(#sc-metal)" stroke="#434f4c"/>').join('') + '</g></g>' +
      '<g filter="url(#sc-shadow)"><rect x="' + (left - 21) + '" y="108" width="' + (width + 42) + '" height="7" rx="3" fill="url(#sc-metal)"/>' +
      '<path d="M' + (left - 26) + ' 83h16v59h-16zM' + (right + 10) + ' 83h16v59h-16z" fill="url(#sc-metal)" stroke="#383e3e"/><rect x="442" y="88" width="16" height="47" rx="2" fill="url(#sc-metal)"/><circle cx="450" cy="112" r="8" fill="#4c5657" stroke="#bfc4bd"/>' +
      springs + drum(left + 10) + drum(right - 10) + '</g>' +
      '<g data-sc-inspect="cables" stroke="#c4c5b9" stroke-width="1.1" opacity=".9">' + [left + 8, right - 8].map(x => '<path data-sc-cable data-x="' + x + '" d="M' + x + ' 131v265"/>').join('') + '</g>' +
      '<path d="M' + (left - 22) + ' 152v254M' + (right + 22) + ' 152v254" stroke="#454e4e" stroke-width="2"/><g fill="#c4c7be">' +
      [164, 220, 282, 344, 397].map(y => '<circle cx="' + (left - 17) + '" cy="' + y + '" r="3"/><circle cx="' + (right + 17) + '" cy="' + y + '" r="3"/>').join('') +
      '</g><path d="M450 65v16" stroke="#c4b18a" stroke-opacity=".55"/><text x="450" y="59" fill="#c5c0b2" font-family="system-ui,sans-serif" font-size="9" letter-spacing="1.5" text-anchor="middle">TORSION SPRING ASSEMBLY</text></svg>';
  }
  function read() {
    return { service: $('#sc-service').value, door: $('[name="sc-door"]:checked').value, count: Number($('#sc-count').value), tier: $('#sc-finish').value, profile: $('#sc-profile').value, urgency: Number($('#sc-urgency').value) };
  }
  function render() {
    const state = read(), quote = calculateSpringEstimate(state);
    $('[data-sc-scene]').innerHTML = diagram({ ...state, count: quote.count });
    applyDoorPosition();
    const packaged = quote.service !== 'springs';
    $('[data-sc-finish]').textContent = packaged ? quote.serviceName : quote.name + ' · ' + quote.warranty + '-year warranty';
    $('#sc-finish').disabled = packaged;
    $('[data-sc-door]').textContent = (state.door === 'double' ? 'Double-car' : 'Single-car') + ' · ' + quote.construction + ' · ' + quote.count + ' springs';
    $('[data-sc-installation]').textContent = money(quote.installation);
    $('[data-sc-afterhours]').textContent = money(quote.afterHours);
    $('[data-sc-total]').textContent = quote.needsQuote ? 'Custom quote' : money(quote.total);
    $('[data-sc-total-label]').textContent = packaged ? 'Starting installed estimate' : 'Estimated installed price';
    $('[data-sc-hardware]').textContent = quote.needsQuote ? 'Quote required' : money(quote.parts);
    $('[data-sc-unit-price]').textContent = packaged ? 'Complete parts package · starting price' : money(quote.unitPrice) + ' × ' + quote.count + (quote.count === 1 ? ' spring' : ' springs');
    $('[data-sc-warranty]').textContent = packaged ? 'Package coverage confirmed on your estimate' : quote.warranty + '-year warranty';
    $('[data-sc-spec]').textContent = packaged ? 'Package price replaces individual spring pricing. Parts and final configuration are confirmed on site.' : 'Base reference: ' + quote.baseSpec + '. Length and inside diameter are confirmed by your technician.';
    $('[data-sc-service-note]').textContent = quote.needsQuote ? 'This configuration needs a custom parts quote. Installation labor is $250; after-hours service adds $99 when selected.' : packaged ? quote.serviceName + ': parts package from ' + money(quote.parts) + ' + $250 installation labor. Selected after-hours service adds $99. Final scope and package suitability are confirmed on site.' : 'Spring price includes your selected Endurance package, size adjustment and replacement count. Installation is itemized separately below.';
    $('[data-sc-setup]').textContent = quote.count + ' × ' + quote.size + ' in. torsion springs';
    $('[data-sc-size-price]').textContent = 'Door-construction estimating preset · ' + money(quote.sizeStep * 10) + ' size adjustment per spring.';
    $('#sc-count').value = String(quote.count);
    $('#sc-count').disabled = !!DOORS[state.profile].count;
    $('[data-sc-count-note]').textContent = DOORS[state.profile].count ? 'This door preset uses four springs. Four-spring installation labor is $250.' : 'Single-car defaults to one spring; double-car defaults to two. Your technician confirms the actual configuration.';
    $('[data-sc-urgency]').textContent = URGENCY[state.urgency];
    $('[data-sc-dispatch]').textContent = URGENCY[state.urgency];
    $('[data-sc-dispatch]').dataset.urgency = state.urgency;
    $('#sc-urgency').style.setProperty('--sc-fill', (state.urgency * 50) + '%');
    $('#sc-urgency').setAttribute('aria-valuetext', URGENCY[state.urgency]);
    $('[data-sc-availability]').textContent = state.urgency === 2 ? 'After-hours charge applies to appointments at 7 PM or later. Call to confirm availability.' : state.urgency === 1 ? 'Priority is a request, not a guaranteed arrival time. Call to confirm the next available route.' : 'Scheduling is confirmed based on technician, route and parts availability.';
    const selection = quote.serviceName + ': ' + (state.door === 'double' ? 'Double-car' : 'Single-car') + ', ' + quote.construction + ', ' + quote.count + ' spring(s), ' + quote.size + ' wire preset, ' + (packaged ? 'package coverage to be confirmed' : quote.name + ', ' + quote.warranty + '-year warranty') + ', ' + URGENCY[state.urgency] + '. ' + (quote.needsQuote ? 'Custom parts quote required; installation labor $250.' : (packaged ? 'Starting' : 'Estimated') + ' installed total before tax: ' + money(quote.total) + '.');
    $('[data-sc-text]').href = 'sms:+19254094974?body=' + encodeURIComponent('Hi Valiant, I would like a spring replacement quote. ' + selection + ' I can attach a photo of the existing spring system.');
  }
  function profilesForCategory() {
    const entries = Object.entries(DOORS).filter(([, p]) => p.category === $('#sc-type').value);
    $('#sc-profile').replaceChildren(...entries.map(([value, p]) => {
      const option = document.createElement('option'); option.value = value; option.textContent = p.name; return option;
    }));
  }
  root.addEventListener('change', event => {
    if (event.target.id === 'sc-position') return;
    if (event.target.id === 'sc-type') profilesForCategory();
    if (event.target.name === 'sc-door' || ['sc-type', 'sc-profile'].includes(event.target.id)) {
      $('#sc-count').value = String(DOORS[$('#sc-profile').value].count || ($('[name="sc-door"]:checked').value === 'double' ? 2 : 1));
    }
    render();
  });
  root.addEventListener('click', event => {
    if (event.target.closest('[data-sc-operate]')) moveDoor(doorTarget > .5 ? 0 : 1);
    const component = event.target.closest('[data-sc-inspect]')?.dataset.scInspect;
    if (COMPONENTS[component]) {
      root.dataset.inspect = component;
      $('[data-sc-help]').textContent = COMPONENTS[component];
      root.querySelectorAll('button[data-sc-inspect]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scInspect === component)));
    }
  });
  $('#sc-position').addEventListener('input', event => {
    cancelAnimationFrame(motionFrame);
    doorPosition = Number(event.target.value) / 100; doorTarget = doorPosition;
    applyDoorPosition();
  });
  $('#sc-urgency').addEventListener('input', render);
  profilesForCategory();
  render();
})();
