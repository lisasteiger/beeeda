import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/carousel.js', import.meta.url), 'utf8');
function setup() {
  let id = 0;
  const frames = new Map(), timers = new Map();
  function element() {
    return { style: {}, dataset: {}, handlers: {},
      addEventListener(type, fn) { (this.handlers[type] ??= []).push(fn); },
      emit(type, data = {}) {
        const event = { preventDefault() { this.prevented = true; }, ...data };
        for (const fn of this.handlers[type] ?? []) fn(event);
        return event;
      },
    };
  }
  const carousel = element();
  const soldLabel = element();
  const link = { href: 'pinkchaos.html', closest: selector => selector === '.image-link' ? link : null };
  const items = Array.from({ length: 6 }, element);
  const sizes = Array.from({ length: 6 }, element);
  items[4].dataset.sold = items[5].dataset.sold = 'true';
  const window = Object.assign(element(), { location: { search: '' }, innerWidth: 1135, matchMedia: () => ({ matches: false }) });
  const classes = new Set();
  const context = vm.createContext({ window, URLSearchParams,
    document: { getElementById: id => id === 'carousel-sold' ? soldLabel : carousel, querySelectorAll: selector => selector === '.carousel-size' ? sizes : items,
      body: { classList: { add: name => classes.add(name) } } },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  vm.runInContext(source, context);
  return { carousel, window, link, frames, timers, classes, soldLabel, sizes,
    at: index => vm.runInContext(`position = ${index}; render()`, context),
    wheel: () => carousel.emit('wheel', { deltaX: 250, deltaY: 0 }),
    down: (pointerId = 1) => carousel.emit('pointerdown', { target: link, pointerId, isPrimary: true, button: 0 }),
    click: detail => carousel.emit('click', { target: link, detail }),
    step() { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn()); },
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

test('sizes follow their image horizontally and only appear at the centre, including wraparound and mobile', () => {
  const page = setup();
  assert.equal(page.sizes[0].style.opacity, 1);
  assert.equal(page.sizes[1].hidden, true);
  page.at(0.1);
  assert.ok(Math.abs(page.sizes[0].style.opacity - 0.5) < 0.001);
  assert.ok(Math.abs(parseFloat(page.sizes[0].style.transform.split('+ ')[1]) + 70) < 0.001);
  page.at(0.3);
  assert.equal(page.sizes[0].hidden, true);
  page.at(6);
  assert.equal(page.sizes[0].style.opacity, 1);
  page.window.innerWidth = 400;
  page.window.matchMedia = () => ({ matches: true });
  page.at(5.9);
  assert.equal(page.sizes[0].hidden, false);
  assert.ok(Math.abs(parseFloat(page.sizes[0].style.transform.split('+ ')[1]) - 31.2) < 0.001);
});
