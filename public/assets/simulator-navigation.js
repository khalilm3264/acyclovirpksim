/* Accessible section navigation, independent of the cached simulator shell. */
(function () {
 'use strict';
 const tabs = document.getElementById('tabs');
 if (!tabs) return;
 const buttons = Array.from(tabs.querySelectorAll('[data-tab]'));
 function syncSelection() {
  for (const button of buttons) {
   const selected = button.classList.contains('active');
   button.setAttribute('aria-selected', String(selected));
   button.tabIndex = selected ? 0 : -1;
  }
 }
 // The simulator also opens sections through scenario, dosing and reference links.
 new MutationObserver(syncSelection).observe(tabs, {subtree:true, attributes:true, attributeFilter:['class']});
 syncSelection();
 // Manual activation lets keyboard users browse labels without running analyses.
 tabs.addEventListener('keydown', function (event) {
  const current = event.target.closest('[role="tab"]');
  if (!current) return;
  const index = buttons.indexOf(current);
  let next;
  if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
  else if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = buttons.length - 1;
  else return;
  event.preventDefault();
  for (const button of buttons) button.tabIndex = -1;
  buttons[next].tabIndex = 0;
  buttons[next].focus();
 });
})();
