import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openShop } from "../shop-db.mjs";
import { pinksChaos } from "../products.js";

const customer = { firstName: "Test", lastName: "Käufer", email: "test@example.com", street: "Testweg 1", postalCode: "8000", city: "Zürich", country: "Schweiz" };
const input = (requestKey = "test-request-000001", items = [{ id: pinksChaos.id, quantity: 1 }]) => ({ requestKey, customer, items });
function fixture(t, catalog = [pinksChaos]) {
  let time = 1000000;
  const folder = mkdtempSync(join(tmpdir(), "beeeda-test-"));
  const path = join(folder, "shop.sqlite");
  const shops = [];
  const open = () => { const shop = openShop(path, catalog, () => time); shops.push(shop); return shop; };
  t.after(() => { for (const shop of shops) shop.close(); rmSync(folder, { recursive: true }); });
  return { shop: open(), open, advance: ms => { time += ms; } };
}

test("two independent database connections cannot reserve the same piece", t => {
  const { shop, open } = fixture(t), other = open();
  const order = shop.reserve("buyer-one", input());
  assert.equal(order.status, "reserved");
  assert.equal(other.products()[0].availability, "reserved");
  assert.throws(() => other.reserve("buyer-two", input()), { status: 409 });
  assert.equal(other.pending("buyer-two"), null);
  shop.finish(order.id, "buyer-one", "confirm");
  assert.equal(other.products()[0].availability, "sold");
  assert.throws(() => other.reserve("buyer-two", input()), { status: 409 });
});

test("server prices, customer details, persistence and private order access", t => {
  const { shop, open } = fixture(t);
  const order = shop.reserve("owner", input(undefined, [{ id: pinksChaos.id, quantity: 1, priceCents: 1 }]));
  assert.equal(order.totalCents, 4960);
  assert.deepEqual(order.customer, customer);
  const restarted = open();
  assert.deepEqual(restarted.order(order.id, "owner"), order);
  assert.throws(() => restarted.order(order.id, "stranger"), { status: 404 });
  assert.throws(() => restarted.finish(order.id, "stranger", "confirm"), { status: 404 });
});

test("cancel releases stock; completed actions and request retries are idempotent", t => {
  const { shop } = fixture(t);
  const order = shop.reserve("one", input());
  assert.equal(shop.reserve("one", input()).id, order.id);
  assert.throws(() => shop.reserve("one", input("different-request-002")), { status: 409 });
  assert.equal(shop.finish(order.id, "one", "cancel").status, "cancelled");
  assert.equal(shop.finish(order.id, "one", "cancel").status, "cancelled");
  assert.throws(() => shop.finish(order.id, "one", "confirm"), { status: 409 });
  const second = shop.reserve("two", input());
  assert.equal(shop.finish(second.id, "two", "confirm").status, "test-paid");
  assert.equal(shop.finish(second.id, "two", "confirm").status, "test-paid");
});

test("expired reservations release stock and late confirmations cannot sell it twice", t => {
  const { shop, advance } = fixture(t);
  const first = shop.reserve("one", input());
  advance(10 * 60 * 1000);
  assert.equal(shop.order(first.id, "one").status, "expired");
  assert.equal(shop.products()[0].availability, "available");
  const second = shop.reserve("two", input());
  assert.throws(() => shop.finish(first.id, "one", "confirm"), { status: 409 });
  assert.equal(shop.order(second.id, "two").status, "reserved");
});

test("a sold product can switch to inquiry instead of SOLD", t => {
  const { shop } = fixture(t, [{ ...pinksChaos, afterSale: "inquiry" }]);
  const order = shop.reserve("one", input());
  shop.finish(order.id, "one", "confirm");
  assert.equal(shop.products()[0].availability, "inquiry");
  assert.throws(() => shop.reserve("two", input()), { status: 409 });
});

test("invalid customer, empty cart, duplicate pieces and quantities are rejected", t => {
  const { shop } = fixture(t);
  for (const bad of [
    { ...input(), customer: { ...customer, street: " " } },
    { ...input(), customer: { ...customer, email: "invalid" } },
    input(undefined, []), input(undefined, [{ id: pinksChaos.id, quantity: 2 }]),
    input(undefined, [{ id: pinksChaos.id, quantity: 1 }, { id: pinksChaos.id, quantity: 1 }]),
  ]) assert.throws(() => shop.reserve("one", bad), { status: 400 });
  assert.equal(shop.products()[0].availability, "available");
});

test("multi-item reservations are all-or-nothing", t => {
  const second = { ...pinksChaos, id: "second", name: "Second" };
  const { shop } = fixture(t, [pinksChaos, second]);
  shop.reserve("one", input(undefined, [{ id: second.id, quantity: 1 }]));
  assert.throws(() => shop.reserve("two", input(undefined, [{ id: pinksChaos.id, quantity: 1 }, { id: second.id, quantity: 1 }])), { status: 409 });
  assert.equal(shop.products()[0].availability, "available");
  assert.equal(shop.pending("two"), null);
});
