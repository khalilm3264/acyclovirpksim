/*
 * AyFlux — educational acyclovir and valacyclovir pharmacokinetics simulator.
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Cats page gallery: reads /cats/gallery.json and lets visitors pick which piece
 * of pixel art is shown. The page works without this script (it ships with the
 * first piece in its HTML); the script only adds the picker and swaps the piece.
 * No inline script is used because the site policy only allows script-src 'self'.
 */
(function (root) {
  "use strict";

  const MAX_PIECES = 24;
  const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
  // Relative to /cats/, PNG or WebP only, no "..", no scheme, no leading slash.
  const SRC_PATTERN = /^(?!.*\.\.)(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:png|webp)$/;

  function clean(value, max) {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
  }

  // Returns only pieces that pass every check; anything malformed is skipped, never rendered.
  function normalizeGallery(data) {
    const pieces = [];
    if (!data || data.schema !== 1 || !Array.isArray(data.pieces)) return pieces;
    const seen = new Set();
    for (const item of data.pieces) {
      if (pieces.length >= MAX_PIECES) break;
      if (!item || typeof item !== "object") continue;
      const id = clean(item.id, 64);
      const src = clean(item.src, 200);
      const title = clean(item.title, 80);
      if (!ID_PATTERN.test(id) || seen.has(id) || !SRC_PATTERN.test(src) || !title) continue;
      seen.add(id);
      const names = Array.isArray(item.names)
        ? item.names.slice(0, 8).map(name => clean(name, 24)).filter(Boolean)
        : [];
      pieces.push({
        id,
        src,
        title,
        names,
        caption: clean(item.caption, 160),
        alt: clean(item.alt, 300) || title
      });
    }
    return pieces;
  }

  function init(doc, win) {
    const image = doc.getElementById("catImage");
    const title = doc.getElementById("catTitle");
    const legend = doc.getElementById("catLegend");
    const caption = doc.getElementById("catCaption");
    const picker = doc.getElementById("catPicker");
    if (!image || !title || !legend || !caption || !picker || typeof win.fetch !== "function") return;

    win.fetch("/cats/gallery.json", { cache: "no-cache", credentials: "same-origin" })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        const pieces = normalizeGallery(data);
        if (!pieces.length) return;
        const buttons = [];

        function show(piece, updateAddress) {
          const path = "/cats/" + piece.src;
          if (image.getAttribute("src") !== path) image.setAttribute("src", path);
          image.setAttribute("alt", piece.alt);
          title.textContent = piece.title;
          title.hidden = pieces.length < 2;
          legend.textContent = "";
          piece.names.forEach((name, index) => {
            if (index) legend.append(" · ");
            const strong = doc.createElement("strong");
            strong.textContent = name;
            legend.append(strong);
          });
          legend.hidden = !piece.names.length;
          caption.textContent = piece.caption;
          caption.hidden = !piece.caption;
          buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.id === piece.id)));
          if (updateAddress && win.history && win.history.replaceState) {
            win.history.replaceState(null, "", "#" + piece.id);
          }
        }

        if (pieces.length > 1) {
          pieces.forEach(piece => {
            const button = doc.createElement("button");
            button.type = "button";
            button.className = "cat-thumb";
            button.dataset.id = piece.id;
            button.setAttribute("aria-pressed", "false");
            button.setAttribute("aria-label", piece.title);
            button.title = piece.title;
            const thumb = doc.createElement("img");
            thumb.src = "/cats/" + piece.src;
            thumb.alt = "";
            thumb.width = 64;
            thumb.height = 64;
            thumb.loading = "lazy";
            thumb.decoding = "async";
            button.append(thumb);
            button.addEventListener("click", () => show(piece, true));
            picker.append(button);
            buttons.push(button);
          });
          picker.hidden = false;
          picker.addEventListener("keydown", event => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            const current = buttons.indexOf(doc.activeElement);
            if (current < 0) return;
            const next = (current + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length;
            buttons[next].focus();
            buttons[next].click();
            event.preventDefault();
          });
        }

        const wanted = /^#([a-z0-9-]+)$/.exec(win.location.hash || "");
        const first = (wanted && pieces.find(piece => piece.id === wanted[1])) || pieces[0];
        show(first, false);
      })
      .catch(() => { /* keep the page exactly as shipped */ });
  }

  const api = { normalizeGallery, MAX_PIECES, SRC_PATTERN, ID_PATTERN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    root.AyFluxCats = api;
    init(document, root);
  }
})(typeof window !== "undefined" ? window : globalThis);
