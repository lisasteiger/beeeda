import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { products } from "./products.js";

export class ShopError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// Ein zentraler Bestand, auch bei mehreren gleichzeitig geöffneten Kassen.
export function openShop(filename, catalog = products, now = Date.now) {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS stock (id TEXT PRIMARY KEY, sold INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, request_key TEXT NOT NULL,
      status TEXT NOT NULL, customer TEXT NOT NULL, created INTEGER NOT NULL,
      expires INTEGER NOT NULL, UNIQUE(owner, request_key));
    CREATE TABLE IF NOT EXISTS order_items (
      order_id TEXT NOT NULL, product_id TEXT NOT NULL, name TEXT NOT NULL,
      price_cents INTEGER NOT NULL, PRIMARY KEY(order_id, product_id));`);
  for (const product of catalog) db.prepare("INSERT OR IGNORE INTO stock(id) VALUES (?)").run(product.id);

  function transaction(fn) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE orders SET status='expired' WHERE status='reserved' AND expires<=?").run(now());
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  }
  function availability(product) {
    if (db.prepare("SELECT sold FROM stock WHERE id=?").get(product.id).sold) return product.afterSale === "inquiry" ? "inquiry" : "sold";
    return db.prepare(`SELECT 1 FROM order_items i JOIN orders o ON o.id=i.order_id
      WHERE i.product_id=? AND o.status='reserved' AND o.expires>?`).get(product.id, now()) ? "reserved" : "available";
  }
  function order(id, owner) {
    const row = db.prepare("SELECT * FROM orders WHERE id=? AND owner=?").get(id, owner);
    if (!row) throw new ShopError("Bestellung nicht gefunden.", 404);
    const items = db.prepare("SELECT product_id AS id, name, price_cents AS priceCents FROM order_items WHERE order_id=?").all(id);
    return { id: row.id, status: row.status, created: row.created, expires: row.expires,
      customer: JSON.parse(row.customer), items, totalCents: items.reduce((sum, item) => sum + item.priceCents, 0), mode: "local-test" };
  }
  return {
    close: () => db.close(),
    products: () => transaction(() => catalog.map(product => ({ ...product, availability: availability(product) }))),
    order: (id, owner) => transaction(() => order(id, owner)),
    pending: owner => transaction(() => {
      const row = db.prepare("SELECT id FROM orders WHERE owner=? AND status='reserved' ORDER BY created DESC LIMIT 1").get(owner);
      return row ? order(row.id, owner) : null;
    }),
    reserve(owner, input) {
      const customer = {};
      for (const key of ["firstName", "lastName", "email", "street", "postalCode", "city", "country"]) {
        const value = input?.customer?.[key];
        if (typeof value !== "string" || !value.trim() || value.length > 200) throw new ShopError("Bitte alle Kontakt- und Adressfelder ausfüllen.");
        customer[key] = value.trim();
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new ShopError("Bitte eine gültige E-Mail-Adresse eingeben.");
      if (typeof input.requestKey !== "string" || !/^[\w-]{16,80}$/.test(input.requestKey)) throw new ShopError("Ungültige Bestellkennung.");
      if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) throw new ShopError("Dein Warenkorb ist leer oder ungültig.");
      const ids = input.items.map(item => item?.id);
      if (new Set(ids).size !== ids.length || input.items.some(item => item.quantity !== 1)) throw new ShopError("Jedes Stück ist nur einmal verfügbar.");
      return transaction(() => {
        const existing = db.prepare("SELECT id FROM orders WHERE owner=? AND request_key=?").get(owner, input.requestKey);
        if (existing) return order(existing.id, owner);
        const pending = db.prepare("SELECT id FROM orders WHERE owner=? AND status='reserved'").get(owner);
        if (pending) throw new ShopError("Du hast bereits eine Reservierung. Schliesse sie ab oder brich sie ab.", 409);
        const chosen = ids.map(id => {
          const product = catalog.find(product => product.id === id);
          if (!product || availability(product) !== "available") throw new ShopError("Ein Stück ist inzwischen reserviert oder verkauft. Bitte prüfe deinen Warenkorb.", 409);
          return product;
        });
        const id = randomUUID(), created = now(), expires = created + 10 * 60 * 1000;
        db.prepare("INSERT INTO orders VALUES (?, ?, ?, 'reserved', ?, ?, ?)").run(id, owner, input.requestKey, JSON.stringify(customer), created, expires);
        for (const product of chosen) db.prepare("INSERT INTO order_items VALUES (?, ?, ?, ?)").run(id, product.id, product.name, product.priceCents);
        return order(id, owner);
      });
    },
    finish(id, owner, action) {
      if (!["confirm", "cancel"].includes(action)) throw new ShopError("Ungültige Aktion.");
      return transaction(() => {
        const current = order(id, owner);
        if (current.status !== "reserved") {
          if (current.status === (action === "confirm" ? "test-paid" : "cancelled")) return current;
          throw new ShopError("Diese Reservierung ist nicht mehr aktiv.", 409);
        }
        if (action === "confirm") for (const item of current.items) db.prepare("UPDATE stock SET sold=1 WHERE id=?").run(item.id);
        db.prepare("UPDATE orders SET status=? WHERE id=?").run(action === "confirm" ? "test-paid" : "cancelled", id);
        return order(id, owner);
      });
    },
  };
}
