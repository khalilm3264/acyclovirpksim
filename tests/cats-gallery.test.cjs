'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const catsDir = path.join(__dirname, '../public/cats');
const { normalizeGallery, MAX_PIECES } = require('../public/cats/cats.js');
const gallery = JSON.parse(fs.readFileSync(path.join(catsDir, 'gallery.json'), 'utf8'));
const page = fs.readFileSync(path.join(catsDir, 'index.html'), 'utf8');

test('every piece in gallery.json is valid, so nothing is silently dropped by the page', () => {
  assert.equal(gallery.schema, 1);
  assert.ok(gallery.pieces.length >= 1, 'the page needs at least one piece');
  assert.equal(normalizeGallery(gallery).length, gallery.pieces.length);
  assert.ok(gallery.pieces.length <= MAX_PIECES);
});

test('every listed image exists, is a PNG or WebP, and stays small enough for a quick page', () => {
  for (const piece of gallery.pieces) {
    const file = path.join(catsDir, piece.src);
    assert.ok(fs.existsSync(file), `${piece.src} is listed but missing`);
    const bytes = fs.readFileSync(file);
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    assert.ok(isPng || isWebp, `${piece.src} is not a real PNG/WebP`);
    if (piece.src.startsWith('art/')) assert.ok(bytes.length <= 2_000_000, `${piece.src} is over 2 MB`);
    assert.ok(piece.alt && piece.alt.length > 10, `${piece.id} needs real alt text`);
  }
});

test('no image is published under cats/art unless gallery.json lists it', () => {
  const dir = path.join(catsDir, 'art');
  if (!fs.existsSync(dir)) return;
  const listed = new Set(gallery.pieces.map(piece => piece.src));
  for (const name of fs.readdirSync(dir)) {
    assert.ok(listed.has(`art/${name}`), `art/${name} is in the repo but not shown or listed`);
  }
});

test('the page stays noindex, deferred and free of inline script', () => {
  assert.match(page, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(page, /<script defer src="\/cats\/cats\.js"><\/script>/);
  const inline = [...page.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(inline.length, 0, 'inline script would violate script-src self');
  for (const id of ['catImage', 'catTitle', 'catLegend', 'catCaption', 'catPicker']) {
    assert.ok(page.includes(`id="${id}"`), `missing #${id}`);
  }
});

test('the first piece matches the HTML that ships, so the page does not flash when the script runs', () => {
  const first = gallery.pieces[0];
  assert.ok(page.includes(`src="/cats/${first.src}"`));
});

test('normalizeGallery refuses anything that could escape /cats/ or run as code', () => {
  const base = { id: 'ok', src: 'art/ok.png', title: 'Ok', alt: 'Pixel art of an ok cat' };
  const bad = [
    { src: '../secret.png' }, { src: 'art/../../x.png' }, { src: '/etc/passwd.png' },
    { src: 'https://example.com/a.png' }, { src: '//example.com/a.png' },
    { src: 'javascript:alert(1).png' }, { src: 'art/a.svg' }, { src: 'art/a.html' },
    { src: 'art/a.png?x=1' }, { id: 'Bad Id' }, { id: '' }, { title: '   ' },
  ];
  for (const override of bad) {
    assert.deepEqual(normalizeGallery({ schema: 1, pieces: [{ ...base, ...override }] }), [], JSON.stringify(override));
  }
  assert.equal(normalizeGallery({ schema: 1, pieces: [base] }).length, 1);
});

test('normalizeGallery de-duplicates ids, caps the count, trims text and falls back to the title for alt text', () => {
  const piece = n => ({ id: `p${n}`, src: `art/p${n}.png`, title: `  Piece   ${n} ` });
  const many = Array.from({ length: 40 }, (_, n) => piece(n));
  assert.equal(normalizeGallery({ schema: 1, pieces: many }).length, MAX_PIECES);
  assert.equal(normalizeGallery({ schema: 1, pieces: [piece(1), piece(1)] }).length, 1);
  const [first] = normalizeGallery({ schema: 1, pieces: [{ ...piece(1), names: [' Claire ', '', 7, 'George'] }] });
  assert.equal(first.title, 'Piece 1');
  assert.equal(first.alt, 'Piece 1');
  assert.deepEqual(first.names, ['Claire', 'George']);
  assert.deepEqual(normalizeGallery({ schema: 2, pieces: [piece(1)] }), []);
  assert.deepEqual(normalizeGallery(null), []);
  assert.deepEqual(normalizeGallery({ schema: 1, pieces: 'nope' }), []);
});
