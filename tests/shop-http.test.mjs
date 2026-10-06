import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test("HTTP checkout: simultaneous buyers, origin protection, private data and restart", async t => {
  const folder = await mkdtemp(join(tmpdir(), "beeeda-http-"));
  let child;
  const start = () => new Promise((resolve, reject) => {
    child = spawn(process.execPath, [fileURLToPath(new URL("../server.mjs", import.meta.url))], {
      env: { ...process.env, PORT: "0", SHOP_DB: join(folder, "shop.sqlite") }, stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.on("error", reject);
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("exit", code => reject(new Error(`Shopserver beendet (${code}): ${output}`)));
    child.stdout.on("data", chunk => {
      const match = String(chunk).match(/http:\/\/localhost:(\d+)/);
      if (match) resolve(`http://localhost:${match[1]}`);
    });
  });
  const stop = () => new Promise(resolve => { child.once("exit", resolve); child.kill("SIGINT"); });
  t.after(async () => { if (child && child.exitCode === null) await stop(); await rm(folder, { recursive: true }); });
  let base = await start();
  const visitor = async () => (await fetch(`${base}/api/products`)).headers.get("set-cookie").split(";")[0];
  const one = await visitor(), two = await visitor();
  const customer = { firstName: "Test", lastName: "Test", email: "test@example.com", street: "Testweg 1", postalCode: "8000", city: "Zürich", country: "Schweiz" };
  const input = { requestKey: "http-test-request-001", customer, items: [{ id: "pinks-chaos", quantity: 1, priceCents: 1 }] };
  const post = (path, cookie, data, origin = base) => fetch(`${base}/api/${path}`, {
    method: "POST", headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  assert.equal((await post("orders", one, input, "https://other.example")).status, 403);
  const results = await Promise.all([post("orders", one, input), post("orders", two, input)]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  const winner = results[0].status === 201 ? one : two, loser = winner === one ? two : one;
  const order = await results.find(result => result.status === 201).json();
  assert.equal(order.totalCents, 4960);
  assert.equal((await fetch(`${base}/api/orders/${order.id}`, { headers: { Cookie: loser } })).status, 404);
  assert.equal((await post("orders", winner, input)).status, 201);
  for (const path of ["/.local/shop.sqlite", "/shop-db.mjs", "/orders.mjs", "/.git/config"]) assert.equal((await fetch(base + path)).status, 404);
  assert.equal((await post(`orders/${order.id}/confirm`, winner, {})).status, 200);
  assert.equal((await post(`orders/${order.id}/confirm`, winner, {})).status, 200);
  assert.equal((await post("orders", loser, input)).status, 409);
  await stop(); base = await start();
  const persisted = await (await fetch(`${base}/api/orders/${order.id}`, { headers: { Cookie: winner } })).json();
  assert.equal(persisted.status, "test-paid");
  assert.deepEqual(persisted.customer, customer);
  assert.equal((await (await fetch(`${base}/api/products`)).json())[0].availability, "sold");
});
