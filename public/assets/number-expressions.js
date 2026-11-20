(function () {
  'use strict';

  const maxLength = 160;
  const literal = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i;

  function evaluateExpression(source) {
    if (typeof source !== 'string' || source.length > maxLength) return null;
    let rest = source.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').trim();

    function take(token) {
      rest = rest.trimStart();
      if (!rest.startsWith(token)) return false;
      rest = rest.slice(token.length);
      return true;
    }

    function factor() {
      if (take('+')) return factor();
      if (take('-')) return -factor();
      if (take('(')) {
        const result = sum();
        return take(')') ? result : NaN;
      }
      const number = literal.exec(rest);
      if (!number) return NaN;
      rest = rest.slice(number[0].length);
      const value = Number(number[0]);
      return Number.isFinite(value) ? value : NaN;
    }

    function product() {
      let result = factor();
      while (true) {
        if (take('*')) result *= factor();
        else if (take('/')) {
          const divisor = factor();
          result = divisor === 0 ? NaN : result / divisor;
        } else return result;
      }
    }

    function sum() {
      let result = product();
      while (true) {
        if (take('+')) result += product();
        else if (take('-')) result -= product();
        else return result;
      }
    }

    const result = sum();
    return !rest.trim() && Number.isFinite(result) ? result : null;
  }

  if (typeof module === 'object' && module.exports) module.exports = evaluateExpression;
  if (typeof document === 'undefined') return;

  const numberField = 'input[type="number"]:not(:disabled):not([readonly])';
  const shortcut = document.createElement('button');
  shortcut.type = 'button';
  shortcut.className = 'number-expression-shortcut';
  shortcut.textContent = 'ƒx';
  shortcut.title = 'Calculate a number (=)';
  shortcut.setAttribute('aria-label', 'Calculate a value for this field');
  shortcut.tabIndex = -1;
  shortcut.hidden = true;

  const dialog = document.createElement('dialog');
  dialog.className = 'number-expression-dialog';
  dialog.setAttribute('aria-labelledby', 'number-expression-heading');
  dialog.innerHTML = `
    <form method="dialog">
      <h2 id="number-expression-heading">Calculate a value</h2>
      <label for="number-expression">Expression</label>
      <input id="number-expression" type="text" maxlength="${maxLength}" autocomplete="off"
             spellcheck="false" autocapitalize="off" placeholder="24*9"
             aria-describedby="number-expression-help" autofocus>
      <p id="number-expression-help">Use +, −, ×, ÷ or parentheses. The field keeps its current units.</p>
      <p class="number-expression-status" role="status"></p>
      <div class="number-expression-actions">
        <button type="button" data-cancel>Cancel</button>
        <button type="submit">Apply</button>
      </div>
    </form>`;

  document.body.append(shortcut, dialog);
  const form = dialog.querySelector('form');
  const expression = dialog.querySelector('input');
  const status = dialog.querySelector('[role="status"]');
  let focusedField = null;
  let target = null;

  function positionShortcut() {
    if (!focusedField?.isConnected || dialog.open) {
      shortcut.hidden = true;
      return;
    }
    const rect = focusedField.getBoundingClientRect();
    const viewport = window.visualViewport;
    const rightEdge = viewport ? viewport.offsetLeft + viewport.width : window.innerWidth;
    const bottomEdge = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    if (rect.bottom <= 0 || rect.top >= bottomEdge) {
      shortcut.hidden = true;
      return;
    }
    shortcut.hidden = false;
    const { offsetWidth: width, offsetHeight: height } = shortcut;
    const left = rect.right + width + 4 <= rightEdge ? rect.right + 4 : rect.right - width;
    const top = left >= rect.right ? rect.top + (rect.height - height) / 2 : rect.top - height - 4;
    shortcut.style.left = Math.max(0, left) + 'px';
    shortcut.style.top = Math.max(0, top) + 'px';
  }

  function openCalculator(field, value, select) {
    target = field;
    expression.value = value;
    previewResult();
    shortcut.hidden = true;
    dialog.showModal();
    expression.focus();
    if (select) expression.select();
    else expression.setSelectionRange(value.length, value.length);
  }

  document.addEventListener('focusin', (event) => {
    focusedField = event.target.matches(numberField) ? event.target : null;
    positionShortcut();
  });
  document.addEventListener('focusout', () => {
    focusedField = null;
    shortcut.hidden = true;
  });
  document.addEventListener('scroll', positionShortcut, { capture: true, passive: true });
  window.addEventListener('resize', positionShortcut);
  window.visualViewport?.addEventListener('resize', positionShortcut);
  window.visualViewport?.addEventListener('scroll', positionShortcut);

  shortcut.addEventListener('pointerdown', (event) => event.preventDefault());
  shortcut.addEventListener('click', () => {
    if (focusedField?.isConnected) openCalculator(focusedField, focusedField.value, true);
  });

  document.addEventListener('keydown', (event) => {
    const field = event.target;
    if (
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !field.matches?.(numberField)
    )
      return;
    if (event.key === '=') {
      event.preventDefault();
      openCalculator(field, field.value, true);
    } else if (['*', '/', '×', '÷'].includes(event.key)) {
      event.preventDefault();
      openCalculator(field, field.value + event.key, false);
    }
  });

  document.addEventListener('paste', (event) => {
    const field = event.target;
    if (!field.matches?.(numberField)) return;
    const text = event.clipboardData?.getData('text').trim() ?? '';
    const unsigned = text.replace(/^[+-]/, '');
    if (!/^[\d\s.eE()+*/×÷−-]+$/.test(text) || literal.exec(unsigned)?.[0] === unsigned) return;
    event.preventDefault();
    openCalculator(field, text, false);
  });

  dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
  function previewResult() {
    const result = evaluateExpression(expression.value);
    status.textContent = result === null ? '' : 'Result: ' + result;
  }
  expression.addEventListener('input', previewResult);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!target?.isConnected || !target.matches(numberField)) {
      dialog.close();
      return;
    }
    const result = evaluateExpression(expression.value);
    if (result === null) {
      status.textContent = 'Enter a calculation with a finite result.';
      expression.focus();
      return;
    }

    // Preserve the numeric field's native range and step constraints, without its previous edit error.
    const check = target.cloneNode();
    check.value = String(result);
    if (!check.validity.valid) {
      status.textContent = check.validationMessage;
      expression.focus();
      return;
    }

    const field = target;
    dialog.close();
    field.value = check.value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    positionShortcut();
  });
})();
