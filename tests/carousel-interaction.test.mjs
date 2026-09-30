import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
function setup() {
  let id = 0;
  const frames = new Map(), timers = new Map();
  function element() {
    return { style: {}, handlers: {},
      addEventListener(type, fn) { (this.handlers[type] ??= []).push(fn); },
      emit(type, data = {}) {
        const event = { preventDefault() { this.prevented = true; }, ...data };
        for (const fn of this.handlers[type] ?? []) fn(event);
        return event;
      },
    };
  }
  const carousel = element();
  const link = { href: 'pinkchaos.html', closest: selector => selector === '.image-link' ? link : null };
  const items = Array.from({ length: 6 }, element);
  const window = Object.assign(element(), { location: { search: '' } });
  const classes = new Set();
  const context = vm.createContext({ window, URLSearchParams,
    document: { getElementById: () => carousel, querySelectorAll: () => items,
      body: { classList: { add: name => classes.add(name) } } },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  vm.runInContext(source, context);
  return { carousel, window, link, frames, timers, classes,
    wheel: () => carousel.emit('wheel', { deltaX: 250, deltaY: 0 }),
    down: (pointerId = 1) => carousel.emit('pointerdown', { target: link, pointerId, isPrimary: true, button: 0 }),
    click: detail => carousel.emit('click', { target: link, detail }),
    step() { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn()); },
    transforms: () => items.map(item => item.style.transform),
  };
}

test('pressing a moving image freezes it and cancels pending snapping', () => {
  const page = setup();
  page.wheel(); page.step();
  assert.ok(page.frames.size > 0);
  assert.ok(page.timers.size > 0);
  const before = page.transforms();
  page.down();
  page.wheel(); page.step();
  assert.deepEqual(page.transforms(), before);
  assert.equal(page.frames.size, 0);
  assert.equal(page.timers.size, 0);
  page.window.emit('pointerup', { pointerId: 1 });
  assert.equal(page.click(1).prevented, true);
  assert.ok(page.classes.has('leaving-to-subsite'));
  assert.equal([...page.timers.values()][0].delay, 900);
  [...page.timers.values()][0].fn();
  assert.equal(page.window.location.href, 'pinkchaos.html');
});

test('a touch tap with small finger jitter still starts the transition', () => {
  const page = setup();
  page.wheel(); page.step(); page.down();
  const before = page.transforms();
  page.carousel.emit('touchstart', { touches: [{ clientX: 200, clientY: 200 }] });
  const move = page.carousel.emit('touchmove', { touches: [{ clientX: 198, clientY: 202 }] });
  page.carousel.emit('touchend');
  assert.equal(move.prevented, undefined);
  assert.deepEqual(page.transforms(), before);
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
