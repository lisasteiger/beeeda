import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openShop, ShopError } from "./shop-db.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const filename = process.env.SHOP_DB || resolve(root, ".local/shop.sqlite");
await mkdir(dirname(filename), { recursive: true });
const shop = openShop(filename);
const port = Number(process.env.PORT || 8001);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const publicFiles = new Set(["index.html", "pinkchaos.html", "produkt02.html", "warenkorb.html", "kasse.html", "archiv.html", "impressum.html", "ruecksendungen.html", "ueber-uns.html", "script.js", "subsite.js", "product-gallery.js", "products.js", "shop.js", "cart-store.js", "cart.js", "checkout.js", "api.js"]);

async function body(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 20000) throw new ShopError("Anfrage zu gross.", 413);
  }
  try { return JSON.parse(text); } catch { throw new ShopError("Ungültige Anfrage."); }
}
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const json = (data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(data)); };
  try {
    if (!["localhost", "127.0.0.1"].includes(req.headers.host?.split(":")[0])) throw new ShopError("Ungültiger Host.", 403);
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      if (req.method === "POST" && (req.headers.origin !== url.origin || !req.headers["content-type"]?.startsWith("application/json"))) throw new ShopError("Ungültiger Ursprung.", 403);
      let owner = req.headers.cookie?.match(/(?:^|;\s*)beeeda_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      if (!owner) {
        owner = randomBytes(32).toString("hex");
        res.setHeader("Set-Cookie", `beeeda_session=${owner}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
      }
      if (req.method === "GET" && url.pathname === "/api/products") return json(shop.products());
      if (req.method === "GET" && url.pathname === "/api/pending-order") return json(shop.pending(owner));
      if (req.method === "POST" && url.pathname === "/api/orders") return json(shop.reserve(owner, await body(req)), 201);
      const match = url.pathname.match(/^\/api\/orders\/([\w-]+)(?:\/(confirm|cancel))?$/);
      if (match && req.method === "GET" && !match[2]) return json(shop.order(match[1], owner));
      if (match && req.method === "POST" && match[2]) { await body(req); return json(shop.finish(match[1], owner, match[2])); }
      throw new ShopError("Nicht gefunden.", 404);
    }
    if (!["GET", "HEAD"].includes(req.method)) throw new ShopError("Methode nicht erlaubt.", 405);
    const path = decodeURIComponent(url.pathname).replace(/^\//, "") || "index.html";
    if (path.includes("..") || (!publicFiles.has(path) && !/^(assets|style)\/[\w./-]+$/.test(path)) || !types[extname(path)]) throw new ShopError("Nicht gefunden.", 404);
    const content = await readFile(resolve(root, path));
    res.writeHead(200, { "Content-Type": types[extname(path)] });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch (error) {
    if (!(error instanceof ShopError) && error.code !== "ENOENT") console.error(error);
    json({ error: error instanceof ShopError ? error.message : error.code === "ENOENT" ? "Nicht gefunden." : "Der lokale Shop konnte die Anfrage nicht bearbeiten." }, error.status || (error.code === "ENOENT" ? 404 : 500));
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Lokaler Testshop: http://localhost:${server.address().port}\nDatenbank: ${filename}\nKeine echten Zahlungen. Testkäufe verändern den lokalen Bestand.`));
process.on("SIGINT", () => server.close(() => { shop.close(); process.exit(); }));
