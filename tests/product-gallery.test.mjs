import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../product-gallery.js", import.meta.url), "utf8");

function setup() {
  const slides = [{ hidden: false }, { hidden: true }, { hidden: true }];
  const listeners = new Map();
  const dots = Array.from({ length: 3 }, () => ({
    addEventListener(type, fn) { this[type] = fn; },
    setAttribute(name, value) { this[name] = value; },
  }));
  let tick;
  const gallery = {
    querySelectorAll: selector => selector === ".gallery-slide" ? slides : dots,
    addEventListener: (type, fn) => listeners.set(type, fn),
    getBoundingClientRect: () => ({ left: 0, width: 300 }),
  };
  vm.runInNewContext(source, {
    document: { getElementById: () => gallery }, Date,
    setInterval(fn, delay) { assert.equal(delay, 5000); tick = fn; return 1; },
    clearInterval() {},
  });
  const visible = () => slides.findIndex(slide => !slide.hidden);
  return { dots, listeners, visible, tick: () => tick() };
}

test("clicks, dots, keyboard and timer cycle through photos", () => {
  const { dots, listeners, visible, tick } = setup();
  const click = clientX => listeners.get("click")({ clientX, target: { closest: () => null } });
  click(250);
  assert.equal(visible(), 1);
  assert.equal(dots[1]["aria-pressed"], "true");
  dots[2].click({ stopPropagation() {} });
  assert.equal(visible(), 2);
  tick();
  assert.equal(visible(), 0);
  listeners.get("keydown")({ key: "ArrowLeft", preventDefault() {} });
  assert.equal(visible(), 2);
  click(250);
  assert.equal(visible(), 0);
  click(50);
  assert.equal(visible(), 2);
});

test("horizontal swipes change one photo; vertical gestures and follow-up clicks do not", () => {
  const { listeners, visible } = setup();
  const start = (x, y) => listeners.get("touchstart")({ touches: [{ clientX: x, clientY: y }] });
  const end = (x, y) => {
    let prevented = false;
    listeners.get("touchend")({ changedTouches: [{ clientX: x, clientY: y }], preventDefault() { prevented = true; } });
    return prevented;
  };
  start(200, 100);
  assert.equal(end(100, 105), true);
  assert.equal(visible(), 1);
  listeners.get("click")({ clientX: 250, target: { closest: () => null } });
  assert.equal(visible(), 1);
  start(200, 100);
  assert.equal(end(190, 20), false);
  assert.equal(visible(), 1);
});
