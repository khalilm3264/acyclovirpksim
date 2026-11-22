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
  new MutationObserver(syncSelection).observe(tabs, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  syncSelection();
  const entries = [
    [
      'Patient & dialysis settings',
      '#patientInputs',
      'creatinine CrCl weight kidney function HD PD CRRT'
    ],
    [
      'Plasma acyclovir graph',
      '#plasmaPanel',
      'concentration CMMG CSF peak trough published study overlay'
    ],
    ['Guided scenarios', '#guidedPanel', 'demo example teaching start'],
    ['Dialysis clearance and sessions', '#clearance', 'kidney removal hemodialysis HD PD CRRT'],
    ['Custom medication timeline', '#doses', 'doses drugs schedule administration infusion'],
    [
      'PD exchange prescription',
      '#pdRxPanel',
      'CAPD APD peritoneal dialysis bags dwells fills drains'
    ],
    ['Export results', '#csv', 'csv xlsx R Python excel latex download results'],
    [
      'Save or load a simulation',
      '#configurationPanel',
      'import export JSON save settings share link'
    ],
    [
      'Interpret the uncertainty band',
      '#uncertaintyNote',
      'long tail percentile coverage 90 Monte Carlo interval'
    ],
    ['Advanced settings', '#advanced', 'Monte Carlo draws uncertainty colorblind options assay'],
    [
      'Compare regimens and baselines',
      '#comparisonTools',
      'compare freeze baseline post HD what if'
    ],
    [
      'Forecast the next measured level',
      '#forecastPanel',
      'Bayesian fit updating validation holdout trough'
    ],
    [
      'Sensitivity heatmap',
      '#heatmapPanel',
      'renal function uncertainty residual creatinine clearance'
    ],
    [
      'Parameter distributions',
      '#ensemblePanel',
      'draws uncertainty Monte Carlo scatterplot violin'
    ],
    ['Import PK-Sim or MoBi curves', '#ospPanel', 'OSP external CSV compare'],
    ['User guide', '/learn/', 'getting started help how to'],
    ['Dialysis guide', '/learn/dialysis/', 'PD CAPD APD HD CRRT dialysis peritoneal'],
    [
      'Model methods and limits',
      '/learn/model-methods/',
      'equations assumptions compartments CMMG uncertainty'
    ],
    ['Data exchange guide', '/learn/interoperability/', 'formats download export CSV R Python OSP'],
    ['Bibliography', '/references/', 'references paper DOI citations evidence'],
    [
      'PD exchanges research',
      '/research/exchanges/',
      'dwell timing sample Boelaert CAPD APD peritoneal'
    ],
    ['Pediatric IV research', '/research/pediatric/', 'child children infant model PK'],
    ['Visual explorer', '/explore/', 'heatmap Sankey compartments 3D'],
    ['Limitations', '/disclaimer/', 'disclaimer educational clinical use'],
    ['Cite AyFlux', '/cite/', 'citation BibTeX cite source']
  ];
  const anchors = new Set(
    entries.filter(([, href]) => href.startsWith('#')).map(([, href]) => href)
  );
  function targetFor(hash) {
    if (!anchors.has(hash) && !/^#ref\d+$/.test(hash)) return null;
    return document.getElementById(hash.slice(1));
  }
  function revealTarget() {
    const hash = location.hash;
    const target = targetFor(hash);
    if (!target) return;
    const panel = target.closest('[role="tabpanel"]');
    const owner = panel && document.getElementById(panel.getAttribute('aria-labelledby'));
    if (owner && !owner.classList.contains('active')) owner.click();
    // Open enclosing disclosures as well as the target itself, if it is a disclosure.
    for (let node = target; node; node = node.parentElement)
      if (node.tagName === 'DETAILS') node.open = true;
    requestAnimationFrame(() => {
      if (hash !== location.hash) return;
      const focusTarget = target.tagName === 'DETAILS' ? target.querySelector('summary') : target;
      if (!focusTarget.matches('input, select, button, summary, a[href], [tabindex]'))
        focusTarget.tabIndex = -1;
      focusTarget.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start' });
    });
  }
  window.addEventListener('hashchange', (event) => {
    if (!location.hash && targetFor(new URL(event.oldURL).hash)) buttons[0].click();
    revealTarget();
  });
  revealTarget();
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (
      !link ||
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (link.hash === location.hash) revealTarget();
  });

  const form = document.getElementById('workspaceSearch');
  const query = document.getElementById('workspaceQuery');
  const results = document.getElementById('workspaceResults');
  const status = document.getElementById('workspaceSearchStatus');
  if (form && query && results && status) {
    const words = (value) => value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    const indexed = entries.map(([label, href, aliases]) => ({
      label,
      href,
      titleWords: words(label),
      keywords: words(`${label} ${aliases}`)
    }));
    function closeSearch() {
      results.hidden = true;
      status.textContent = '';
    }
    function showMatches() {
      const tokens = words(query.value);
      if (!tokens.length) {
        closeSearch();
        return;
      }
      const matches = indexed
        .filter(({ keywords }) =>
          tokens.every((token) => keywords.some((word) => word.startsWith(token)))
        )
        .sort((a, b) => {
          const score = ({ titleWords }) =>
            tokens.filter((token) => titleWords.some((word) => word.startsWith(token))).length;
          return score(b) - score(a);
        })
        .slice(0, 8);
      results.replaceChildren();
      for (const { label, href } of matches) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        const kind = document.createElement('small');
        kind.textContent = href.startsWith('#') ? 'Simulator tool' : 'Site page';
        link.append(kind);
        item.append(link);
        results.append(item);
      }
      if (!matches.length) {
        const empty = document.createElement('li');
        empty.className = 'finder-empty';
        empty.textContent = 'No matching tools or pages. Try “PD”, “CSV”, or “uncertainty”.';
        results.append(empty);
      }
      results.hidden = false;
      status.textContent = matches.length
        ? `${matches.length} matching tools or pages. Press Tab to browse the results.`
        : 'No matching tools or pages.';
    }
    form.hidden = false;
    query.addEventListener('input', showMatches);
    query.addEventListener('focus', showMatches);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (results.hidden) showMatches();
      results.querySelector('a')?.click();
    });
    form.addEventListener('keydown', (event) => {
      if (results.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        query.focus();
        closeSearch();
      } else if (
        event.target === query &&
        event.key === 'ArrowDown' &&
        results.querySelector('a')
      ) {
        event.preventDefault();
        results.querySelector('a').focus();
      }
    });
    results.addEventListener('click', (event) => {
      if (!event.target.closest('a')) return;
      query.value = '';
      closeSearch();
    });
    form.addEventListener('focusout', (event) => {
      if (!form.contains(event.relatedTarget)) closeSearch();
    });
    document.addEventListener('pointerdown', (event) => {
      if (!form.contains(event.target)) closeSearch();
    });
  }
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
