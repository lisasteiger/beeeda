import test from 'node:test';
import assert from 'node:assert/strict';
import { createCartStore, cartTotals, CART_KEY, CURRENCY } from '../cart-store.js';
import { pinksChaos } from '../products.js';

const product = { id: 'test', name: 'Testartikel', priceCents: 1050, image: 'assets/01.png', href: 'pinkchaos.html' };
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('CHF, exact totals for unique pieces and persistence', () => {
  const db = storage();
  const cart = createCartStore(db);
  assert.equal(CURRENCY, 'CHF');
  assert.deepEqual(cart.read(), []);
  cart.add(product);
  cart.add({ ...product, id: 'other', priceCents: 20 });
  assert.deepEqual(cartTotals(cart.read()), { quantity: 2, priceCents: 1070 });
  cart.setQuantity('test', 1);
  assert.deepEqual(cartTotals(createCartStore(db).read()), { quantity: 2, priceCents: 1070 });
  cart.remove('test');
  cart.remove('other');
  assert.deepEqual(createCartStore(db).read(), []);
});

test('repeated additions merge and quantities stay within bounds', () => {
  const cart = createCartStore(storage());
  cart.add(product);
  cart.add(product);
  assert.equal(cart.read().length, 1);
  assert.equal(cart.read()[0].quantity, 1);
  for (const value of [0, -1, 1.5, NaN, 2, 100]) {
    assert.throws(() => cart.setQuantity('test', value));
    assert.throws(() => cart.add(product, value));
  }
  assert.throws(() => cart.add({ ...product, priceCents: -1 }));
});

test('malformed storage, invalid rows, duplicate IDs and unsafe paths', () => {
  const db = storage();
  db.setItem(CART_KEY, '{broken');
  const cart = createCartStore(db);
  assert.deepEqual(cart.read(), []);
  db.setItem(CART_KEY, JSON.stringify([
    null, { ...product, quantity: -5 },
    { ...product, quantity: 1, image: 'https://example.com/image.png', href: 'javascript:alert(1)' },
    { ...product, quantity: 2 },
  ]));
  assert.deepEqual(cart.read(), [{ ...product, quantity: 1, image: '', href: '' }]);
});

test('blocked reads or writes retain an in-memory cart', () => {
  for (const db of [
    { getItem() { throw Error('blocked'); } },
    { getItem() { return null; }, setItem() { throw Error('full'); } },
  ]) {
    const cart = createCartStore(db);
    cart.add(product);
    assert.equal(cart.persistent, false);
    cart.setQuantity(product.id, 1);
    assert.equal(cart.read()[0].quantity, 1);
    cart.remove(product.id);
    assert.deepEqual(cart.read(), []);
  }
});

test('items with an unknown price persist without being treated as free', () => {
  const db = storage();
  const cart = createCartStore(db);
  cart.add({ ...product, priceCents: null });
  cart.add({ ...product, priceCents: null });
  cart.add({ ...product, id: 'priced-item' });
  const items = createCartStore(db).read();
  assert.equal(items[0].quantity, 1);
  assert.deepEqual(cartTotals(items), { quantity: 2, priceCents: null });
  cart.remove(product.id);
  assert.deepEqual(cartTotals(cart.read()), { quantity: 1, priceCents: 1050 });
});

test('old multiple quantities become one and receive the confirmed price', () => {
  const db = storage();
  db.setItem(CART_KEY, JSON.stringify([{ ...pinksChaos, priceCents: null, quantity: 2 }]));
  const cart = createCartStore(db);
  assert.equal(cart.read()[0].priceCents, 4950);
  assert.deepEqual(cartTotals(cart.read()), { quantity: 1, priceCents: 4950 });
  cart.add(pinksChaos);
  assert.deepEqual(cartTotals(cart.read()), { quantity: 1, priceCents: 4950 });
});
