// Modo42 website: mobile menu and signup forms.
// Pages work without this file; it only enhances them.
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  // ---------- Mobile navigation ----------
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  // ---------- Signup forms ----------
  // Each form POSTs JSON to its `data-endpoint` (functions/api/signup.js).
  // If the attribute is empty, nothing is sent and the visitor is told so.
  // See README.md → "Connect the forms".
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var messages = {
    valueMissing: {
      email: 'Enter your email address.',
      name: 'Enter your full name.',
      focus: 'Choose your primary coaching focus.',
      consent: 'Tick the box so we can contact you about coaching.',
    },
    typeMismatch: 'Enter an email address in the format name@example.com.',
  };

  function fieldError(field) {
    var value = field.type === 'checkbox' ? field.checked : field.value.trim();
    if (field.required && !value) {
      return messages.valueMissing[field.name] || 'This field is required.';
    }
    if (field.type === 'email' && value && !EMAIL_PATTERN.test(value)) {
      return messages.typeMismatch;
    }
    if (field.maxLength > 0 && typeof value === 'string' && value.length > field.maxLength) {
      return 'Keep this under ' + field.maxLength + ' characters.';
    }
    return '';
  }

  function showFieldError(field, message) {
    var errorEl = document.getElementById(field.id + '-error');
    if (message) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
    if (errorEl) errorEl.textContent = message;
  }

  function setStatus(statusEl, state, title, body) {
    statusEl.setAttribute('data-state', state);
    statusEl.innerHTML = '';
    var strong = document.createElement('strong');
    strong.textContent = title;
    statusEl.appendChild(strong);
    statusEl.appendChild(document.createTextNode(body));
  }

  function collect(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = typeof value === 'string' ? value.trim() : value;
    });
    delete data.company; // honeypot
    data.source = form.getAttribute('data-form');
    data.page = window.location.pathname;
    return data;
  }

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var statusEl = form.querySelector('.form-status');
    var submit = form.querySelector('[type="submit"]');
    var fields = Array.prototype.slice.call(
      form.querySelectorAll('input:not([type="hidden"]):not([tabindex="-1"]), select, textarea')
    );
    var copy = {
      success: form.getAttribute('data-success') || 'Thanks, you’re on the list.',
      successBody: form.getAttribute('data-success-body') || '',
    };

    form.setAttribute('novalidate', '');

    fields.forEach(function (field) {
      var validateLive = function () {
        if (field.getAttribute('aria-invalid') === 'true') showFieldError(field, fieldError(field));
      };
      field.addEventListener('input', validateLive);
      field.addEventListener('change', validateLive);
      field.addEventListener('blur', function () {
        if (field.value) showFieldError(field, fieldError(field));
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var firstInvalid = null;
      fields.forEach(function (field) {
        var message = fieldError(field);
        showFieldError(field, message);
        if (message && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        setStatus(
          statusEl,
          'error',
          'Check the highlighted field' + (form.querySelectorAll('[aria-invalid="true"]').length > 1 ? 's.' : '.'),
          ' Nothing has been sent.'
        );
        firstInvalid.focus();
        return;
      }

      // Bots fill the hidden field; quietly drop those submissions.
      var trap = form.querySelector('.honeypot input');
      if (trap && trap.value) return;

      var endpoint = (form.getAttribute('data-endpoint') || '').trim();
      if (!endpoint) {
        setStatus(
          statusEl,
          'info',
          'This form isn’t live yet.',
          ' Your details look good, but nothing was sent or saved because the form isn’t connected to a signup service. Please check back soon.'
        );
        statusEl.focus();
        return;
      }

      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      setStatus(statusEl, 'info', 'Sending…', '');

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(collect(form)),
      })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          form.reset();
          setStatus(statusEl, 'success', copy.success, copy.successBody ? ' ' + copy.successBody : '');
        })
        .catch(function () {
          setStatus(
            statusEl,
            'error',
            'We couldn’t save your details.',
            ' Check your connection and try again in a moment.'
          );
        })
        .finally(function () {
          submit.disabled = false;
          submit.removeAttribute('aria-busy');
          statusEl.focus();
        });
    });
  });
})();
