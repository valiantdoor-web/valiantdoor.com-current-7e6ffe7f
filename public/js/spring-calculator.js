(function () {
  'use strict';
  const PRICES = Object.freeze({ torsion: { 1: 159, 2: 189 }, highlift: { 1: 459, 2: 459 }, torquemaster: { 1: 549, 2: 649 }, afterHours: 100 });
  const URGENCY = ['Scheduled daytime', 'Priority daytime request', 'After hours · 7 PM or later'];
  const FINISH = { standard: 'Standard torsion springs', duramaster: 'DuraMaster powder-coated', endurance: 'Endurance Max premium' };
  function calculateSpringEstimate(input) {
    const system = ['torsion', 'highlift', 'torquemaster'].includes(input.system) ? input.system : 'torsion';
    const count = Number(input.count) === 1 ? 1 : 2;
    const urgency = [0, 1, 2].includes(Number(input.urgency)) ? Number(input.urgency) : 0;
    const installation = PRICES[system][count];
    const afterHours = urgency === 2 ? PRICES.afterHours : 0;
    return { installation, afterHours, startingAmount: installation + afterHours, upgradeQuoted: input.finish !== 'standard', system, count, urgency };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { calculateSpringEstimate };
  if (typeof document === 'undefined') return;
  const root = document.querySelector('[data-spring-calculator]');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const money = n => '$' + n.toLocaleString('en-US');
  function coil(x, y, length, finish, mirrored) {
    const turns = Math.floor(length / 3.6);
    const wire = Array.from({ length: turns }, (_, i) => '<ellipse cx="' + (x + 4 + i * (length - 8) / (turns - 1)).toFixed(1) + '" cy="' + y + '" rx="3.6" ry="15.5" fill="none" stroke="url(#sc-coil-' + finish + ')" stroke-width="2.6"/>').join('');
    const fixed = mirrored ? x + length : x;
    const winding = mirrored ? x : x + length;
    return '<g><rect x="' + x + '" y="' + (y - 13) + '" width="' + length + '" height="26" rx="10" fill="#0d0f10"/>' + wire +
      '<path d="M' + (fixed - 7) + ' ' + (y - 11) + 'h14v22h-14z" fill="url(#sc-metal)"/><rect x="' + (winding - 10) + '" y="' + (y - 11) + '" width="20" height="22" rx="3" fill="url(#sc-metal)"/><ellipse cx="' + winding + '" cy="' + y + '" rx="5.5" ry="13" fill="#33383b" stroke="#8d9292"/><circle cx="' + winding + '" cy="' + (y - 7) + '" r="2" fill="' + (mirrored ? '#903a30' : '#313336') + '"/><circle cx="' + winding + '" cy="' + (y + 7) + '" r="2" fill="#121516"/></g>';
  }
  function diagram(state) {
    const doubleDoor = state.door === 'double';
    const width = doubleDoor ? 610 : 380, left = (900 - width) / 2, right = left + width;
    const panelColumns = doubleDoor ? 4 : 2, panelWidth = (width - 30) / panelColumns;
    let panels = '', hinges = '';
    for (let row = 0; row < 4; row++) {
      const y = 153 + row * 62;
      panels += '<path d="M' + left + ' ' + (y + 56) + 'h' + width + '" stroke="#44494b" stroke-width="2"/><path d="M' + left + ' ' + (y + 58) + 'h' + width + '" stroke="#bfc0b5" stroke-opacity=".32"/>';
      for (let col = 0; col < panelColumns; col++) {
        const x = left + 15 + col * panelWidth;
        panels += '<rect x="' + (x + 8) + '" y="' + (y + 8) + '" width="' + (panelWidth - 16) + '" height="40" rx="3" fill="url(#sc-inset)" stroke="#93978e" stroke-opacity=".5"/><path d="M' + (x + 14) + ' ' + (y + 43) + 'v-28h' + (panelWidth - 28) + '" fill="none" stroke="#eeeeDF" stroke-opacity=".28"/>';
      }
      if (row < 3) for (let h = 0; h <= panelColumns; h++) {
        const x = left + (h === 0 ? 8 : h === panelColumns ? width - 8 : width * h / panelColumns);
        hinges += '<g transform="translate(' + x + ',' + (y + 57) + ')"><rect x="-5" y="-9" width="10" height="18" rx="1.5" fill="url(#sc-metal)" stroke="#555b5b" stroke-width=".7"/><rect x="-7" y="-2" width="14" height="4" rx="2" fill="#9b9e9b"/><circle cy="-6" r="1" fill="#353a3a"/><circle cy="6" r="1" fill="#353a3a"/></g>';
      }
    }
    const shaftY = 112, mid = 450, coilLength = doubleDoor ? 181 : 104;
    const springs = state.count === 2
      ? coil(mid - coilLength - 18, shaftY, coilLength, state.finish, true) + coil(mid + 18, shaftY, coilLength, state.finish, false)
      : coil(mid - coilLength * 1.18 - 18, shaftY, coilLength * 1.18, state.finish, true);
    const drum = x => '<g><path d="M' + (x - 16) + ' 93h32v38h-32z" fill="url(#sc-metal)" stroke="#4c5355"/>' + [0, 1, 2, 3, 4].map(i => '<ellipse cx="' + (x - 12 + i * 6) + '" cy="112" rx="4" ry="21" fill="none" stroke="' + (i % 2 ? '#9b9e9b' : '#424b4f') + '" stroke-width="2.4"/>').join('') + '<rect x="' + (x - 5) + '" y="107" width="10" height="10" rx="2" fill="#656e70"/></g>';
    return '<svg viewBox="0 0 900 475" role="img" aria-label="Realistic inside view of a ' + (doubleDoor ? 'double' : 'single') + ' sectional garage door with ' + state.count + ' torsion spring' + (state.count === 2 ? 's' : '') + ', cable drums, lift cables, hinges and steel tracks"><defs>' +
      '<linearGradient id="sc-wall" x2="0" y2="1"><stop stop-color="#353638"/><stop offset=".65" stop-color="#232527"/><stop offset="1" stop-color="#1a1c1d"/></linearGradient>' +
      '<linearGradient id="sc-door" x2=".1" y2="1"><stop stop-color="#acb0a7"/><stop offset=".4" stop-color="#858d85"/><stop offset="1" stop-color="#6b746e"/></linearGradient>' +
      '<linearGradient id="sc-inset" x2="0" y2="1"><stop stop-color="#747e77"/><stop offset=".1" stop-color="#9ea59b"/><stop offset=".8" stop-color="#929a90"/><stop offset="1" stop-color="#686f69"/></linearGradient>' +
      '<linearGradient id="sc-metal" x2="0" y2="1"><stop stop-color="#d4d6d0"/><stop offset=".18" stop-color="#9b9f9b"/><stop offset=".4" stop-color="#50585a"/><stop offset=".56" stop-color="#bbc0b9"/><stop offset=".7" stop-color="#747d7e"/><stop offset="1" stop-color="#454c50"/></linearGradient>' +
      '<linearGradient id="sc-coil-standard" x2="0" y2="1"><stop stop-color="#777f82"/><stop offset=".18" stop-color="#c0c4c1"/><stop offset=".35" stop-color="#424b4d"/><stop offset=".65" stop-color="#272c2e"/><stop offset="1" stop-color="#7c8688"/></linearGradient>' +
      '<linearGradient id="sc-coil-duramaster" x2="0" y2="1"><stop stop-color="#656b6b"/><stop offset=".18" stop-color="#969e9a"/><stop offset=".4" stop-color="#202628"/><stop offset=".8" stop-color="#151a1b"/><stop offset="1" stop-color="#616a67"/></linearGradient>' +
      '<linearGradient id="sc-coil-endurance" x2="0" y2="1"><stop stop-color="#9a8a66"/><stop offset=".18" stop-color="#d1bd85"/><stop offset=".4" stop-color="#49483a"/><stop offset=".8" stop-color="#282c29"/><stop offset="1" stop-color="#8c8865"/></linearGradient>' +
      '<radialGradient id="sc-light"><stop stop-color="#e9d2a0" stop-opacity=".11"/><stop offset="1" stop-color="#dfcda5" stop-opacity="0"/></radialGradient>' +
      '<filter id="sc-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-opacity=".45"/></filter>' +
      '<filter id="sc-grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".035"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter></defs>' +
      '<rect width="900" height="475" fill="url(#sc-wall)"/><path d="M0 74h900M0 288h900M120 0v408M782 0v408" stroke="#aaa" stroke-opacity=".045"/><ellipse cx="450" cy="50" rx="430" ry="280" fill="url(#sc-light)"/><path d="M0 412h900v63H0z" fill="#1a1c1d"/><path d="M0 412h900" stroke="#51504a" stroke-opacity=".4"/><ellipse cx="450" cy="420" rx="' + (width / 2 + 25) + '" ry="11" fill="#080b0c" opacity=".7"/>' +
      '<path d="M' + (left - 17) + ' 408V161q0-36 25-55l45-30M' + (right + 17) + ' 408V161q0-36-25-55l-45-30" fill="none" stroke="#8d9392" stroke-width="7"/><path d="M' + (left - 17) + ' 408V161q0-36 25-55l45-30M' + (right + 17) + ' 408V161q0-36-25-55l-45-30" fill="none" stroke="#d4d8d0" stroke-opacity=".45" stroke-width="1.4"/>' +
      '<rect x="' + (left - 5) + '" y="143" width="' + (width + 10) + '" height="267" rx="3" fill="#0e1213" filter="url(#sc-shadow)"/><g filter="url(#sc-grain)"><rect x="' + left + '" y="150" width="' + width + '" height="250" rx="2" fill="url(#sc-door)"/>' + panels + hinges + '</g>' +
      '<rect x="' + left + '" y="398" width="' + width + '" height="10" fill="#131817"/><rect x="438" y="351" width="24" height="6" rx="3" fill="#262e2b" stroke="#adb2a7" stroke-width="1"/>' +
      '<g filter="url(#sc-shadow)"><rect x="' + (left - 21) + '" y="108" width="' + (width + 42) + '" height="7" rx="3" fill="url(#sc-metal)"/>' +
      '<path d="M' + (left - 26) + ' 83h16v59h-16zM' + (right + 10) + ' 83h16v59h-16z" fill="url(#sc-metal)" stroke="#383e3e"/><rect x="442" y="88" width="16" height="47" rx="2" fill="url(#sc-metal)"/><circle cx="450" cy="112" r="8" fill="#4c5657" stroke="#bfc4bd"/>' +
      springs + drum(left + 10) + drum(right - 10) + '</g>' +
      '<path d="M' + (left + 8) + ' 131v265M' + (right - 8) + ' 131v265" stroke="#c4c5b9" stroke-width="1.1" opacity=".9"/>' +
      [left + 8, right - 8].map(x => '<path d="M' + (x - 7) + ' 390h14v13h-14z" fill="url(#sc-metal)" stroke="#434f4c"/><circle cx="' + x + '" cy="396" r="2" fill="#313c36"/>').join('') +
      '<path d="M' + (left - 22) + ' 152v254M' + (right + 22) + ' 152v254" stroke="#454e4e" stroke-width="2"/><g fill="#c4c7be">' +
      [164, 220, 282, 344, 397].map(y => '<circle cx="' + (left - 17) + '" cy="' + y + '" r="3"/><circle cx="' + (right + 17) + '" cy="' + y + '" r="3"/>').join('') +
      '</g><path d="M450 65v16" stroke="#c4b18a" stroke-opacity=".55"/><text x="450" y="59" fill="#c5c0b2" font-family="system-ui,sans-serif" font-size="9" letter-spacing="1.5" text-anchor="middle">TORSION SPRING ASSEMBLY</text></svg>';
  }
  function read() {
    return { door: $('[name="sc-door"]:checked').value, count: Number($('#sc-count').value), finish: $('#sc-finish').value, system: $('#sc-system').value, urgency: Number($('#sc-urgency').value) };
  }
  function render() {
    const state = read(), quote = calculateSpringEstimate(state);
    $('[data-sc-scene]').innerHTML = diagram(state);
    $('[data-sc-finish]').textContent = FINISH[state.finish];
    $('[data-sc-door]').textContent = (state.door === 'double' ? 'Double door' : 'Single door') + ' · ' + state.count + '-spring configuration';
    $('[data-sc-installation]').textContent = money(quote.installation) + '+';
    $('[data-sc-afterhours]').textContent = money(quote.afterHours);
    $('[data-sc-total]').textContent = money(quote.startingAmount) + '+';
    $('[data-sc-hardware]').textContent = quote.upgradeQuoted ? 'Upgrade quoted separately' : 'Confirmed after inspection';
    $('[data-sc-urgency]').textContent = URGENCY[state.urgency];
    $('[data-sc-dispatch]').textContent = URGENCY[state.urgency];
    $('[data-sc-dispatch]').dataset.urgency = state.urgency;
    $('#sc-urgency').style.setProperty('--sc-fill', (state.urgency * 50) + '%');
    $('#sc-urgency').setAttribute('aria-valuetext', URGENCY[state.urgency]);
    $('[data-sc-upgrade]').hidden = !quote.upgradeQuoted;
    $('[data-sc-availability]').textContent = state.urgency === 2 ? 'After-hours charge applies to appointments at 7 PM or later. Call to confirm availability.' : state.urgency === 1 ? 'Priority is a request, not a guaranteed arrival time. Call to confirm the next available route.' : 'Scheduling is confirmed based on technician, route and parts availability.';
    const selection = (state.door === 'double' ? 'Double door' : 'Single door') + ', ' + state.count + ' spring(s), ' + FINISH[state.finish] + ', ' + $('#sc-system').selectedOptions[0].text + ', ' + URGENCY[state.urgency] + '.';
    $('[data-sc-text]').href = 'sms:+19254094974?body=' + encodeURIComponent('Hi Valiant, I would like a spring replacement quote. ' + selection + ' I can attach a photo of the existing spring system.');
  }
  root.addEventListener('change', event => {
    if (event.target.name === 'sc-door') $('#sc-count').value = event.target.value === 'double' ? '2' : '1';
    render();
  });
  $('#sc-urgency').addEventListener('input', render);
  render();
})();
