// Customer lead capture -> Housecall Pro (via /api/lead).
// Replaces the former SureFire Local / promio.com form hijack.
// On API failure, show an error and keep the form available for retry.
(function () {
  'use strict';

  var forms = document.querySelectorAll('form[action="/thank-you"]');
  if (!forms.length) return;

  // Read the Nextdoor ad click ID captured by global-chrome.js (if any), so
  // it can ride along with this lead into Housecall Pro for CAPI attribution.
  function readCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  // Record the accepted lead once in the official GA4 stream. Attempts and
  // booking-link clicks never fire this key event.
  function fireConversionThen(done) {
    if (window.ValiantAnalytics) {
      window.ValiantAnalytics.leadAccepted('website_lead', done);
    } else {
      // Measurement must never block customer delivery or manufacture success.
      done();
    }
  }

  Array.prototype.forEach.call(forms, function (form) {
    // The instant estimate form uploads photos and is handled by
    // estimate-upload.js; skip it here to avoid a double submission.
    if (form.hasAttribute('data-estimate-upload')) return;
    if (form.dataset.valiantLeadBound) return;
    form.dataset.valiantLeadBound = 'true';
    var inFlight = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (inFlight) return;
      inFlight = true;

      var button = form.querySelector('[type="submit"]');
      var originalLabel = button ? button.textContent : '';
      if (button) {
        button.disabled = true;
        button.textContent = 'Sending...';
      }

      // Collect text fields; skip file inputs (photos can't be forwarded to
      // the lead API), but record whether any were selected.
      var data = Object.assign({ source: window.location.origin + window.location.pathname },
        window.ValiantAnalytics ? window.ValiantAnalytics.attribution() : {});
      var ndclid = readCookie('vg_ndclid');
      if (ndclid) data.ndclid = ndclid;
      var hasPhotos = false;
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.disabled) return;
        if (el.type === 'file') {
          if (el.files && el.files.length) hasPhotos = true;
          return;
        }
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
        data[el.name] = el.value;
      });
      if (hasPhotos) data.photos = true;

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res.json().catch(function () { return { ok: false }; })
            .then(function (result) { return res.ok ? result : { ok: false }; });
        })
        .then(function (result) {
          if (result && result.ok) {
            fireConversionThen(function () {
              window.location.href = '/thank-you';
            });
          } else {
            inFlight = false;
            showError(form, button, originalLabel, result && result.error);
          }
        })
        .catch(function () {
          inFlight = false;
          showError(form, button, originalLabel);
        });
    });
  });

  function showError(form, button, originalLabel, message) {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel || 'Submit';
    }
    var existing = form.querySelector('.lead-error');
    if (!existing) {
      existing = document.createElement('p');
      existing.className = 'lead-error';
      existing.setAttribute('role', 'alert');
      existing.style.color = '#b00020';
      existing.style.marginTop = '0.75rem';
      form.appendChild(existing);
    }
    existing.textContent =
      (message || 'Sorry, something went wrong sending your request.') +
      ' You can also call us at (925) 409-4974.';
  }
})();
