import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/carousel.js', import.meta.url), 'utf8')
  .replace('export function initCarousel(carousel, selectedId) {', 'const carousel = document.getElementById("carousel"); const selectedId = preferredId;')
  .replace('return () => {', 'globalThis.cleanup = () => {')
  .replace(/\n}\s*$/, '');
function setup({ count = 6, preferredId = 'product-0', query = '', saved = {} } = {}) {
  let id = 0;
  let clock = 0;
  const frames = new Map(), timers = new Map();
  function element() {
    return { style: { setProperty(key, value) { this[key] = value; } }, dataset: {}, handlers: {}, querySelector: () => null,
      addEventListener(type, fn, options) {
        (this.handlers[type] ??= []).push(fn);
        options?.signal?.addEventListener('abort', () => { this.handlers[type] = this.handlers[type].filter(handler => handler !== fn); });
      },
      emit(type, data = {}) {
        const event = { preventDefault() { this.prevented = true; }, ...data };
        for (const fn of this.handlers[type] ?? []) fn(event);
        return event;
      },
    };
  }
  const carousel = element();
  const soldLabel = element();
  const reducedLabel = element();
  const link = { href: 'pinkchaos.html', closest: selector => selector === '.image-link' ? link : null };
  const items = Array.from({ length: count }, (_, index) => Object.assign(element(), { dataset: { productId: 'product-' + index } }));
  const sizes = Array.from({ length: count }, element);
  if (count > 5) items[4].dataset.sold = items[5].dataset.sold = 'true';
  if (count > 2) items[2].dataset.reduced = 'true';
  if (count > 4) items[4].dataset.reduced = 'true';
  carousel.querySelector = selector => selector === '#carousel-reduced' ? reducedLabel : soldLabel;
  carousel.querySelectorAll = selector => selector === '.carousel-size' ? sizes : items;
  const window = Object.assign(element(), { location: { search: query, pathname: '/', hash: '' }, innerWidth: 1135, matchMedia: () => ({ matches: false }), history: { replaceState() {} } });
  const classes = new Set();
  const storage = new Map(Object.entries(saved));
  const context = vm.createContext({ window, URLSearchParams, AbortController, preferredId,
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    document: { getElementById: id => id === 'carousel-sold' ? soldLabel : carousel, querySelectorAll: selector => selector === '.carousel-size' ? sizes : items,
      body: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } } },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  vm.runInContext(source, context);
  return { carousel, window, link, frames, timers, classes, soldLabel, reducedLabel, sizes, storage,
    cleanup: () => context.cleanup(),
    at: index => vm.runInContext(`position = ${index}; render()`, context),
    wheel: () => carousel.emit('wheel', { deltaX: 250, deltaY: 0 }),
    down: (pointerId = 1) => carousel.emit('pointerdown', { target: link, pointerId, isPrimary: true, button: 0 }),
    click: detail => carousel.emit('click', { target: link, detail }),
    step(elapsed = 1000 / 60) { clock += elapsed; const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(clock)); },
    position: () => vm.runInContext('position', context),
    transforms: () => items.map(item => item.style.transform),
  };
}

test('pressing and clicking a moving image keeps its animation running', () => {
  const page = setup();
  page.wheel(); page.step();
  assert.ok(page.frames.size > 0);
  assert.ok(page.timers.size > 0);
  const before = page.transforms();
  page.down();
  page.wheel(); page.step();
  assert.notDeepEqual(page.transforms(), before);
  assert.ok(page.frames.size > 0);
  page.window.emit('pointerup', { pointerId: 1 });
  assert.equal(page.click(1).prevented, true);
  assert.ok(page.classes.has('leaving-to-subsite'));
  const navigation = [...page.timers.values()].find(timer => timer.delay === 900);
  assert.ok(navigation);
  const clicked = page.transforms();
  page.step();
  assert.notDeepEqual(page.transforms(), clicked);
  navigation.fn();
  assert.equal(page.window.location.href, 'pinkchaos.html');
});

test('carousel responds promptly and at the same speed on 60 Hz and 120 Hz screens', () => {
  const regular = setup(), fast = setup();
  regular.carousel.emit('keydown', { key: 'ArrowRight' });
  fast.carousel.emit('keydown', { key: 'ArrowRight' });
  for (let frame = 0; frame < 6; frame++) regular.step();
  assert.ok(regular.position() > 0.7);
  for (let frame = 0; frame < 54; frame++) regular.step();
  for (let frame = 0; frame < 120; frame++) fast.step(1000 / 120);
  assert.equal(regular.position(), 1);
  assert.equal(fast.position(), 1);
});

test('diagonal trackpad input follows the dominant axis and mouse line units are supported', () => {
  const page = setup();
  page.carousel.emit('wheel', { deltaX: 1, deltaY: 100, deltaMode: 0 });
  for (let frame = 0; frame < 120 && page.frames.size; frame++) page.step();
  assert.ok(Math.abs(page.position() - 0.35) < 0.001);
  const mouse = setup();
  mouse.carousel.emit('wheel', { deltaX: 0, deltaY: 3, deltaMode: 1 });
  for (let frame = 0; frame < 120 && mouse.frames.size; frame++) mouse.step();
  assert.ok(Math.abs(mouse.position() - 0.168) < 0.001);
});

test('a touch tap with small finger jitter still starts the transition', () => {
  const page = setup();
  page.wheel(); page.step(); page.down();
  const before = page.transforms();
  page.carousel.emit('touchstart', { touches: [{ clientX: 200, clientY: 200 }] });
  const move = page.carousel.emit('touchmove', { touches: [{ clientX: 198, clientY: 202 }] });
  page.carousel.emit('touchend');
  page.step();
  assert.equal(move.prevented, undefined);
  assert.notDeepEqual(page.transforms(), before);
  assert.equal(page.click(1).prevented, true);
  assert.ok(page.classes.has('leaving-to-subsite'));
});

test('swiping suppresses accidental navigation; the following tap and keyboard work', () => {
  const page = setup();
  page.down();
  page.carousel.emit('touchstart', { touches: [{ clientX: 300, clientY: 100 }] });
  page.carousel.emit('touchmove', { touches: [{ clientX: 100, clientY: 100 }] });
  page.step();
  page.carousel.emit('touchend');
  page.window.emit('pointerup', { pointerId: 1 });
  assert.equal(page.click(1).prevented, true);
  page.down(2);
  assert.equal(page.click(1).prevented, true);
  assert.equal(page.click(0).prevented, true);
  assert.equal([...page.timers.values()].length, 1);
});

test('a cancelled pointer does not lock scrolling', () => {
  const page = setup();
  page.down(); page.window.emit('pointercancel', { pointerId: 1 });
  page.wheel();
  assert.ok(page.frames.size > 0);
});

test('unfinished carousel previews do not navigate', () => {
  const page = setup();
  page.link.href = '';
  page.click(1);
  assert.equal(page.timers.size, 0);
  assert.equal(page.classes.has('leaving-to-subsite'), false);
});

test('sold label fades near the centre without following the 3D transform', () => {
  const page = setup();
  assert.equal(page.soldLabel.style.opacity, 0);
  page.at(4);
  assert.equal(page.soldLabel.style.opacity, 1);
  const before = page.transforms();
  page.at(4.475);
  assert.ok(page.soldLabel.style.opacity > 0 && page.soldLabel.style.opacity < 1);
  assert.notDeepEqual(page.transforms(), before);
  assert.equal(page.soldLabel.style.transform, undefined);
  page.at(3.4);
  assert.equal(page.soldLabel.style.opacity, 0);
  page.at(5);
  assert.equal(page.soldLabel.style.opacity, 1);
  page.at(0);
  assert.equal(page.soldLabel.style.opacity, 0);
});

test('reduced label fades like sold while allowing navigation; sold takes precedence', () => {
  const page = setup();
  assert.equal(page.reducedLabel.style.opacity, 0);
  page.at(2);
  assert.equal(page.reducedLabel.style.opacity, 1);
  page.click(1);
  assert.equal(page.classes.has('leaving-to-subsite'), true);
  page.at(2.475);
  assert.ok(page.reducedLabel.style.opacity > 0 && page.reducedLabel.style.opacity < 1);
  page.at(4);
  assert.equal(page.reducedLabel.style.opacity, 0);
  assert.equal(page.soldLabel.style.opacity, 1);
});

test('sizes stay centred and fade as their image moves away, including wraparound and mobile', () => {
  const page = setup();
  assert.equal(page.sizes[0].style.opacity, 1);
  assert.equal(page.sizes[1].hidden, true);
  page.at(0.1);
  assert.ok(Math.abs(page.sizes[0].style.opacity - 0.5) < 0.001);
  assert.equal(page.sizes[0].style.transform, undefined);
  page.at(0.3);
  assert.equal(page.sizes[0].hidden, true);
  page.at(6);
  assert.equal(page.sizes[0].style.opacity, 1);
  page.window.innerWidth = 400;
  page.window.matchMedia = () => ({ matches: true });
  page.at(5.9);
  assert.equal(page.sizes[0].hidden, false);
  assert.equal(page.sizes[0].style.transform, undefined);
});

test('all thirteen products can reach the centre and distant products never invert', () => {
  const page = setup({ count: 13 });
  for (let index = 0; index < 13; index++) {
    page.at(index);
    assert.equal(page.carousel.dataset.currentProduct, 'product-' + index);
    assert.equal(page.sizes[index].style.opacity, 1);
    assert.ok(page.transforms().every(transform => Number(transform.match(/scale\(([^)]+)\)/)[1]) > 0));
  }
});

test('a fresh visit never repeats the previous starting product', () => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const page = setup({ count: 13, preferredId: null, saved: { 'beeeda.carousel-start': 'product-4' } });
    assert.notEqual(page.carousel.dataset.currentProduct, 'product-4');
    assert.equal(page.storage.get('beeeda.carousel-start'), page.carousel.dataset.currentProduct);
  }
  assert.equal(setup({ count: 1, preferredId: null }).carousel.dataset.currentProduct, 'product-0');
  assert.doesNotThrow(() => setup({ count: 0, preferredId: null }));
});

test('returning selects the viewed product; content updates preserve the current product', () => {
  assert.equal(setup({ count: 13, preferredId: null, query: '?back&product=product-9' }).carousel.dataset.currentProduct, 'product-9');
  assert.equal(setup({ count: 13, preferredId: null, query: '?back', saved: { 'beeeda.last-product': 'product-8' } }).carousel.dataset.currentProduct, 'product-8');
  const page = setup({ count: 14, preferredId: 'product-12' });
  assert.equal(page.carousel.dataset.currentProduct, 'product-12');
  page.storage.set('beeeda.last-product', 'product-10');
  page.window.emit('pageshow', { persisted: true });
  assert.equal(page.carousel.dataset.currentProduct, 'product-10');
});

test('keyboard navigation wraps and reinitialization can remove every old listener and animation', () => {
  const page = setup({ count: 13 });
  page.carousel.emit('keydown', { key: 'ArrowLeft' });
  for (let frame = 0; frame < 200 && page.frames.size; frame++) page.step();
  assert.equal(page.carousel.dataset.currentProduct, 'product-12');
  page.wheel();
  page.cleanup();
  assert.equal(page.frames.size, 0);
  assert.equal(page.timers.size, 0);
  assert.ok(Object.values(page.carousel.handlers).every(handlers => handlers.length === 0));
  assert.ok(Object.values(page.window.handlers).every(handlers => handlers.length === 0));
});
