// Run with: node --test tests/site.test.cjs
// Isolated DOM fixtures exercise the production script. No requests reach Google.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');

function fixture({ seen = true, reduced = false, hash = '', now = '2026-09-10T17:00:00Z', failure = null } = {}) {
  let document;
  class Element {
    constructor(id = '') {
      this.id = id; this.value = ''; this.textContent = '—'; this.hidden = false;
      this.disabled = false; this.listeners = {}; this.attributes = {}; this.classes = new Set();
      this.classList = {
        add: (...names) => names.forEach(n => this.classes.add(n)),
        remove: (...names) => names.forEach(n => this.classes.delete(n)),
        toggle: (n, on) => on ? this.classes.add(n) : this.classes.delete(n),
      };
      this.style = { setProperty() {} };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    fire(name, extra = {}) { return this.listeners[name]?.({ type: name, preventDefault() {}, stopPropagation() {}, ...extra }); }
    setPointerCapture(id) { this.pointer = id; }
    hasPointerCapture(id) { return this.pointer === id; }
    releasePointerCapture() { this.pointer = null; }
    focus() { document.activeElement = this; }
    scrollIntoView(options) { this.lastScroll = options; }
    appendChild() {}
    remove() { this.removed = true; }
    querySelector(selector) { return query(selector); }
    querySelectorAll(selector) { return queryAll(selector); }
  }
  const nodes = {};
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) nodes[match[1]] = new Element(match[1]);
  nodes.thanks.hidden = true;
  nodes['guests-other-wrap'].hidden = true;
  const radios = ['Yes !!!!!!!', "Unfortunately, can't make it", 'Not sure yet'].map(value => Object.assign(new Element(), { value }));
  const buttonText = new Element();
  const image = new Element();
  const links = ['details', 'venue', 'rsvp'].map(id => Object.assign(new Element(), { hash: '#' + id }));
  function query(selector) {
    if (selector === 'input[name="attendance"]:checked') return radios.find(r => r.checked) || null;
    if (selector === 'input[name="attendance"]') return radios[0];
    if (selector === '.btn__text') return buttonText;
    if (selector === '.hero__image') return image;
    const error = selector.match(/^\[data-error-for="(.*?)"\]$/);
    if (error) return nodes['error-' + error[1]];
    return selector.startsWith('#') ? nodes[selector.slice(1)] : null;
  }
  function queryAll(selector) {
    if (selector === 'input[name="attendance"]') return radios;
    if (selector === '.nav__links a') return links;
    if (selector === 'main > section') return ['hero', 'countdown', 'details', 'venue', 'rsvp'].map(id => nodes[id]);
    if (selector === '.reveal') return [nodes['hero-title'], nodes.details];
    return [];
  }
  document = { getElementById: id => nodes[id], querySelector: query, querySelectorAll: queryAll,
    createElement: () => new Element(), documentElement: new Element(), activeElement: null };
  document.documentElement.scrollHeight = 4000;
  Object.assign(nodes['rsvp-form'], { fullName: nodes.fullName, invitedGuest: nodes.invitedGuest });
  nodes['rsvp-form'].reset = () => {
    ['fullName', 'guests', 'guestsOther', 'invitedGuest'].forEach(id => nodes[id].value = '');
    radios.forEach(r => r.checked = false);
  };
  const intervals = new Set(), timeouts = new Map(), requests = [];
  let sequence = 0;
  class Observer { observe() {} unobserve() {} }
  const window = { matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    scrollY: 0, innerWidth: 1280, innerHeight: 800, scrollTo() {}, addEventListener() {}, IntersectionObserver: Observer };
  class Clock extends Date { static now() { return new Date(now).getTime(); } }
  const context = {
    window, document, location: { hash }, sessionStorage: { getItem: () => seen ? 'yes' : null, setItem() {} },
    IntersectionObserver: Observer, Date: Clock, FormData, AbortController,
    setTimeout: (fn, delay) => { const id = ++sequence; timeouts.set(id, { fn, delay }); return id; },
    clearTimeout: id => timeouts.delete(id), setInterval: () => { const id = ++sequence; intervals.add(id); return id; },
    clearInterval: id => intervals.delete(id), requestAnimationFrame: fn => fn(),
    fetch: (url, options) => { requests.push({ url, options }); return failure ? Promise.reject(failure) : Promise.resolve({ type: 'opaque' }); },
  };
  vm.runInNewContext(script, context, { filename: 'assets/app.js' });
  function fill(attendance = 0) {
    nodes.fullName.value = 'Test Guest'; nodes.guests.value = '2 guests'; nodes.invitedGuest.value = 'Second Guest';
    radios[attendance].checked = true;
  }
  async function submit() { nodes['rsvp-form'].fire('submit'); await new Promise(resolve => setImmediate(resolve)); }
  return { nodes, document, radios, requests, intervals, timeouts, fill, submit, buttonText };
}

test('page has unique IDs, working internal targets, and existing local assets', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1]);
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)"/g)) assert.ok(fs.existsSync(path.join(root, match[1])), match[1]);
  for (const match of html.matchAll(/aria-(?:describedby|labelledby)="([^"]+)"/g)) {
    for (const id of match[1].split(' ')) assert.ok(ids.includes(id), id);
  }
  assert.equal((html.match(/<main>/g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
});

test('initial form validation prevents requests and focuses the first error', async () => {
  const f = fixture(); await f.submit();
  assert.equal(f.requests.length, 0);
  assert.equal(f.document.activeElement, f.nodes.fullName);
  assert.equal(f.nodes.fullName.attributes['aria-invalid'], 'true');
  assert.equal(f.nodes['error-attendance'].hidden, false);
});

test('valid RSVP preserves exact Google Forms payload and exposes the thank-you panel', async () => {
  const f = fixture(); f.fill(); await f.submit();
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].options.mode, 'no-cors');
  assert.deepEqual(Object.fromEntries(f.requests[0].options.body.entries()), {
    'entry.1498135098': 'Test Guest', 'entry.877086558': 'Yes !!!!!!!',
    'entry.111771323': '2 guests', 'entry.2606285': 'Second Guest',
  });
  assert.equal(f.nodes['rsvp-form'].hidden, true);
  assert.equal(f.nodes.thanks.hidden, false);
  assert.equal(f.document.activeElement, f.nodes.thanks);
  assert.match(f.nodes['thanks-body'].textContent, /reply has been sent/);
  assert.equal(f.timeouts.size, 0);
});

test('network failures preserve entered values and restore the submit button', async () => {
  const f = fixture({ failure: new TypeError('Network unavailable') }); f.fill(); await f.submit();
  assert.equal(f.nodes['rsvp-form'].hidden, false);
  assert.equal(f.nodes.thanks.hidden, true);
  assert.equal(f.nodes.fullName.value, 'Test Guest');
  assert.equal(f.nodes['submit-btn'].disabled, false);
  assert.match(f.nodes['form-status'].textContent, /couldn’t send/);
  assert.equal(f.timeouts.size, 0);
});

test('timeout feedback does not falsely confirm delivery', async () => {
  const failure = new Error('timeout'); failure.name = 'AbortError';
  const f = fixture({ failure }); f.fill(); await f.submit();
  assert.match(f.nodes['form-status'].textContent, /may have been sent/);
  assert.equal(f.nodes.thanks.hidden, true);
});

test('another RSVP resets fields, selection, and focus', async () => {
  const f = fixture(); f.fill(2); await f.submit(); f.nodes['another-btn'].fire('click');
  assert.equal(f.nodes.thanks.hidden, true);
  assert.equal(f.nodes['rsvp-form'].hidden, false);
  assert.equal(f.nodes.fullName.value, '');
  assert.equal(f.radios.some(r => r.checked), false);
  assert.equal(f.document.activeElement, f.nodes.fullName);
});

test('countdown uses Amman offset and cleans up after the celebration', () => {
  const f = fixture(); assert.equal(f.nodes['cd-days'].textContent, '30');
  assert.equal(f.nodes['cd-hours'].textContent, '00');
  const done = fixture({ now: '2026-10-12T00:00:00Z' });
  assert.match(done.nodes.clock.innerHTML, /Thank you for celebrating/);
  assert.equal(done.intervals.size, 0);
});

test('invitation traps focus, supports Escape, and restores the page', () => {
  const f = fixture({ seen: false });
  assert.equal(f.nodes.site.inert, true);
  assert.equal(f.document.activeElement, f.nodes['gate-open']);
  f.nodes.gate.fire('keydown', { key: 'Tab' });
  assert.equal(f.document.activeElement, f.nodes['gate-skip']);
  f.nodes.gate.fire('keydown', { key: 'Escape' });
  assert.equal(f.nodes.site.inert, false);
  assert.equal(f.document.activeElement, f.nodes['hero-title']);
});

test('every visit starts closed, including returning visitors and direct links', () => {
  for (const options of [{ seen: true }, { hash: '#rsvp' }, { reduced: true }]) {
    const f = fixture(options);
    assert.equal(f.nodes.gate.hidden, false);
    assert.equal(f.nodes.site.inert, true);
  }
});

test('click opens in 3D; reduced motion opens immediately without motion', () => {
  const f = fixture(); f.nodes['gate-open'].fire('click', { detail: 1 });
  assert.ok(f.nodes.gate.classes.has('is-open'));
  assert.equal(f.nodes.site.inert, true);
  [...f.timeouts.values()].find(t => t.delay === 1100).fn();
  assert.equal(f.nodes.site.inert, false);
  const calm = fixture({ reduced: true, hash: '#[invalid%' });
  calm.nodes['gate-open'].fire('click', { detail: 0 });
  assert.equal(calm.nodes.site.inert, false);
});

test('downward swipe opens the cover and duplicate click cannot restart it', () => {
  const f = fixture(), button = f.nodes['gate-open'];
  button.fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
  button.fire('pointermove', { pointerId: 1, clientX: 104, clientY: 210 });
  assert.ok(f.nodes.gate.classes.has('is-dragging'));
  button.fire('pointerup', { pointerId: 1, clientX: 104, clientY: 210 });
  button.fire('click', { detail: 1 });
  assert.ok(f.nodes.gate.classes.has('is-open'));
  assert.equal([...f.timeouts.values()].filter(t => t.delay === 1100).length, 1);
});

test('short, upward, sideways, and cancelled swipes do not open the invitation', () => {
  for (const [x, y, event] of [[102,130,'pointerup'],[100,0,'pointerup'],[240,210,'pointerup'],[100,230,'pointercancel']]) {
    const f = fixture(), button = f.nodes['gate-open'];
    button.fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
    button.fire('pointermove', { pointerId: 1, clientX: x, clientY: y });
    button.fire(event, { pointerId: 1, clientX: x, clientY: y });
    button.fire('click', { detail: 1 });
    assert.equal(f.nodes.gate.classes.has('is-open'), false);
    assert.equal(f.nodes.gate.classes.has('is-dragging'), false);
    button.fire('click', { detail: 0 });
    assert.ok(f.nodes.gate.classes.has('is-open'), 'keyboard opening remains available');
  }
});

test('guest hints follow party size without enabling unsupported Google options', () => {
  const f = fixture(); f.nodes.guests.value = '3 guests'; f.nodes.guests.fire('change');
  assert.match(f.nodes['invited-hint'].textContent, /2 guests/);
  assert.equal(f.nodes['guests-other-wrap'].hidden, true);
  f.nodes.guests.value = '1 guest'; f.nodes.guests.fire('change');
  assert.match(f.nodes['invited-hint'].textContent, /leave this blank/);
});
