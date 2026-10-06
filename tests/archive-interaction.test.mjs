import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("archive taps toggle the image on mobile without navigating", () => {
  let mobile = true;
  const item = {
    pressed: "false",
    addEventListener(_, listener) { this.click = listener; },
    getAttribute() { return this.pressed; },
    setAttribute(_, value) { this.pressed = value; },
  };
  const window = { matchMedia: () => ({ matches: mobile }), location: { href: "archiv.html" } };
  vm.runInNewContext(readFileSync(new URL("../subsite.js", import.meta.url), "utf8"), {
    window,
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [item],
      documentElement: { classList: { contains: () => false } },
    },
  });
  item.click();
  assert.equal(item.pressed, "true");
  item.click();
  assert.equal(item.pressed, "false");
  mobile = false;
  item.click();
  assert.equal(item.pressed, "false");
  assert.equal(window.location.href, "archiv.html");
});
