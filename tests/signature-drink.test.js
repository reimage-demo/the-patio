// @vitest-environment node
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { afterEach, expect, test } from 'vitest';
const root = process.env.PATIO_TEST_ROOT || new URL('../', import.meta.url).pathname;
const html = readFileSync(`${root}/menu.html`, 'utf8');
const script = readFileSync(`${root}/menu.js`, 'utf8');
const key = 'patio_signature_punch_session_v2';
const windows = [];
afterEach(() => windows.splice(0).forEach(w => w.close()));
function setup({ seen = false, available = true, brokenStorage = false, legacySeen = false, delayed = false } = {}) {
  const { window: w } = new JSDOM(html, { url: 'https://patio.test/menu.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  windows.push(w);
  const item = { _id: 'punch', name: 'Bucket Rum Punch', category: 'Rum', price: 1500, description: 'The Patio’s signature rum punch.', imageUrl: '/assets/images/bucket-rum-punch.webp', isAvailable: available, isFeatured: true, showsStartingPrice: true, optionGroups: [{ _id: 'sizes', name: 'Size', selectionMode: 'single', minSelections: 1, maxSelections: 1, options: [{ id: 'small', name: 'Small', price: 0 }, { id: 'large', name: 'Large', price: 1000 }] }] };
  w.PatioData = { fallbackMenu: [] };
  w.PatioUtils = { escapeHtml: String, money: cents => `$${(cents/100).toFixed(2)}` };
  w.PATIO_CONFIG = { convexUrl: 'https://example.convex.cloud' };
  w.requestAnimationFrame = fn => fn();
  w.HTMLElement.prototype.scrollIntoView = function() {};
  w.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
  w.HTMLDialogElement.prototype.close = function() { this.open = false; this.dispatchEvent(new w.Event('close')); };
  let update;
  w.PatioConvex = { ConvexClient: class {
    close() {}
    onUpdate(name, args, callback) {
      if (name === 'ordering:configuration') callback({ provider: 'clover' });
      if (name === 'menuItems:listPublicCatalog') { update = callback; if (!delayed) callback({ sections: [{ _id: 'rum', name: 'Rum', items: [item] }] }); }
      return () => {};
    }
  } };
  if (seen) w.sessionStorage.setItem(key, '1');
  if (brokenStorage) Object.defineProperty(w, 'sessionStorage', { get() { throw new Error('Storage disabled'); } });
  if (legacySeen) w.localStorage.setItem('patio_signature_punch_seen_v1', '1');
  w.eval(script);
  return { w, d: w.document, item, update };
}
test('first visit shows photo/prices and CTA filters Rum and opens size picker', () => {
  const { w, d } = setup();
  expect(d.querySelector('#signatureWelcome').open).toBe(true);
  expect(d.querySelector('#signaturePrices').textContent).toBe('Small $15.00 · Large $25.00');
  expect(d.querySelector('#signatureWelcome img').src).toContain('bucket-rum-punch.webp');
  expect(w.sessionStorage.getItem(key)).toBe('1');
  d.querySelector('#signatureCta').click();
  expect(d.querySelector('#signatureWelcome').open).toBe(false);
  expect(d.querySelector('[data-category="rum"]').getAttribute('aria-pressed')).toBe('true');
  expect(d.querySelector('#customizeDialog').open).toBe(true);
  expect(d.querySelector('#customizeGroups').textContent).toContain('$25.00');
});
test('size is required; both sizes remain separate cart lines with correct totals', () => {
  const { w, d } = setup({ seen: true });
  const submit = () => d.querySelector('#customizeForm').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  d.querySelector('[data-add]').click(); submit();
  expect(d.querySelector('#cartCount').textContent).toBe('0');
  expect(d.querySelector('#customizeMessage').textContent).toContain('Size');
  d.querySelector('input[value="small"]').click(); submit();
  expect(d.querySelector('#cartTotal').textContent).toBe('$15.00');
  d.querySelector('[data-add]').click(); d.querySelector('input[value="large"]').click();
  expect(d.querySelector('#addCustomized').textContent).toContain('$25.00'); submit();
  expect(d.querySelector('#cartTotal').textContent).toBe('$40.00');
  expect(d.querySelectorAll('.cart-item')).toHaveLength(2);
  expect(d.querySelector('#cartItems').textContent).toContain('Large');
});
test('return visits in the same session and unavailable drink do not show the popup', () => {
  expect(setup({ seen: true }).d.querySelector('#signatureWelcome').open).toBe(false);
  expect(setup({ available: false }).d.querySelector('#signatureWelcome').open).toBe(false);
});
test('dismissal works with blocked storage and live refresh does not reopen it', () => {
  const { d, item, update } = setup({ brokenStorage: true });
  d.querySelector('[data-dismiss-signature]').click();
  expect(d.querySelector('#signatureWelcome').open).toBe(false);
  expect(d.body.classList.contains('signature-welcome-open')).toBe(false);
  update({ sections: [{ _id: 'rum', name: 'Rum', items: [{ ...item, description: 'Changed' }] }] });
  expect(d.querySelector('#signatureWelcome').open).toBe(false);
});

test('a new browsing session shows the popup even if the old permanent flag exists', () => {
  const { d } = setup({ legacySeen: true });
  expect(d.querySelector('#signatureWelcome').open).toBe(true);
  expect(d.querySelector('#showSignatureDrink')).toBeNull();
});
test('popup waits for another dialog to close when live data arrives', async () => {
  const { w, d, item, update } = setup({ delayed: true });
  d.querySelector('#customizeDialog').showModal();
  update({ sections: [{ _id: 'rum', name: 'Rum', items: [item] }] });
  expect(d.querySelector('#signatureWelcome').open).toBe(false);
  expect(w.sessionStorage.getItem(key)).toBeNull();
  d.querySelector('#customizeDialog').close();
  await Promise.resolve();
  expect(d.querySelector('#signatureWelcome').open).toBe(true);
});
test('popup waits for a hidden tab to become visible before counting it as seen', () => {
  const { w, d, item, update } = setup({ delayed: true });
  Object.defineProperty(d, 'visibilityState', { value: 'hidden', configurable: true });
  update({ sections: [{ _id: 'rum', name: 'Rum', items: [item] }] });
  expect(w.sessionStorage.getItem(key)).toBeNull();
  Object.defineProperty(d, 'visibilityState', { value: 'visible', configurable: true });
  d.dispatchEvent(new w.Event('visibilitychange'));
  expect(d.querySelector('#signatureWelcome').open).toBe(true);
});
