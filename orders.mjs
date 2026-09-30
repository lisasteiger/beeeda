import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const filename = process.env.SHOP_DB || resolve(dirname(fileURLToPath(import.meta.url)), ".local/shop.sqlite");
const db = new DatabaseSync(filename, { readOnly: true });
const orders = db.prepare("SELECT id, status, customer, created, expires FROM orders ORDER BY created DESC").all();
for (const order of orders) {
  const items = db.prepare("SELECT name, price_cents AS priceCents FROM order_items WHERE order_id=?").all(order.id);
  console.log(JSON.stringify({ ...order, customer: JSON.parse(order.customer), items }, null, 2));
}
if (!orders.length) console.log("Noch keine lokalen Testbestellungen.");
db.close();
