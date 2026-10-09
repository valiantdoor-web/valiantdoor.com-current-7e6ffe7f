(() => {
  const form = document.querySelector('#portfolio-filters');
  if (!form) return;
  const query = document.querySelector('#portfolio-query');
  const city = document.querySelector('#portfolio-city');
  const scope = document.querySelector('#portfolio-scope');
  const includeEmpty = document.querySelector('#portfolio-include-empty');
  const cards = [...document.querySelectorAll('.portfolio-card')];
  const index = cards.map(card => ({card, text: card.dataset.search.toLocaleLowerCase(), scopes: JSON.parse(card.dataset.scopes)}));
  const params = new URLSearchParams(location.search);
  query.value = params.get('q') || '';
  includeEmpty.checked = params.get('empty') === '1';
  for (const [control, key] of [[city, 'city'], [scope, 'scope']]) {
    const value = params.get(key) || '';
    if ([...control.options].some(option => option.value === value)) control.value = value;
  }
  function filter() {
    let count = 0;
    const search = query.value.trim().toLocaleLowerCase();
    for (const item of index) {
      const visible = (includeEmpty.checked || item.card.dataset.hasMedia === 'true') && (!city.value || item.card.dataset.city === city.value) &&
        (!scope.value || item.scopes.includes(scope.value)) && (!search || item.text.includes(search));
      item.card.hidden = !visible;
      if (visible) count++;
    }
    document.querySelector('#portfolio-count').textContent = `Showing ${count} of ${cards.length} projects.`;
    document.querySelector('#portfolio-no-results').hidden = count !== 0;
    const next = new URLSearchParams();
    if (search) next.set('q', query.value.trim());
    if (city.value) next.set('city', city.value);
    if (scope.value) next.set('scope', scope.value);
    if (includeEmpty.checked) next.set('empty', '1');
    history.replaceState(null, '', location.pathname + (next.size ? '?' + next : ''));
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', filter);
  form.addEventListener('change', filter);
  form.addEventListener('reset', () => setTimeout(filter, 0));
  filter();
})();
