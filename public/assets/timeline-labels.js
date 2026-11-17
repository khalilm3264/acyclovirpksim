/* Label dynamic timeline fields without coupling accessibility to PK calculations. */
(function () {
  'use strict';
  function connectLabels(container, rowSelector, kind, fieldKey) {
    if (!container) return;
    function refresh() {
      for (const [index, row] of Array.from(container.querySelectorAll(rowSelector)).entries()) {
        for (const label of row.querySelectorAll('label')) {
          const field = label.nextElementSibling;
          if (!field || !field.matches('input, select') || !field.dataset[fieldKey]) continue;
          const id = 'timeline-' + kind + '-' + (index + 1) + '-' + field.dataset[fieldKey];
          field.id = id;
          label.htmlFor = id;
          field.setAttribute(
            'aria-label',
            (kind === 'session' ? 'Session ' : 'Medication dose ') +
              (index + 1) +
              ': ' +
              label.textContent.trim()
          );
        }
      }
    }
    new MutationObserver(refresh).observe(container, { childList: true, subtree: true });
    refresh();
  }
  connectLabels(document.getElementById('scheduleRows'), '.intervals', 'session', 'field');
  connectLabels(document.getElementById('doseRows'), '.dose-row', 'dose', 'doseField');
})();
