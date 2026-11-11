(function (w, d) {
  if (w.oaiq) return;

  function queue() {
    queue.q.push(arguments);
  }
  queue.q = [];
  w.oaiq = queue;

  const sdk = d.createElement('script');
  sdk.async = true;
  sdk.src = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
  d.head.appendChild(sdk);
  queue('init', { pixelId: '4FrSW1Gooauus2SNwmhLLf', debug: true });
})(window, document);
