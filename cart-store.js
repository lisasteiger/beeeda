import { pinksChaos } from "./products.js";

// Preise werden in Rappen gespeichert, damit Summen exakt bleiben.
export const CURRENCY = "CHF";
export const CART_KEY = "beeeda.cart.v1";

function normalizeItem(item) {
  // Gespeicherte Vorschauartikel erhalten die aktuellen Produktdaten.
  if (item?.id === pinksChaos.id) item = { ...item, ...pinksChaos };
  if (!item || typeof item.id !== "string" || !item.id.trim() ||
      typeof item.name !== "string" || !item.name.trim() ||
      (item.priceCents !== null && (!Number.isSafeInteger(item.priceCents) ||
      item.priceCents < 0 || item.priceCents > 100000000)) || !Number.isInteger(item.quantity) ||
      item.quantity < 1 || item.quantity > 99) return null;

  return {
    id: item.id,
    name: item.name,
    priceCents: item.priceCents,
    quantity: 1,
    image: typeof item.image === "string" && /^assets\/[\w./-]+$/.test(item.image)
      && !item.image.includes("..") ? item.image : "",
    href: typeof item.href === "string" && /^[\w-]+\.html$/.test(item.href)
      ? item.href : "",
  };
}

export function createCartStore(storage) {
  let memory = [];
  let persistent = true;
  if (storage === undefined) {
    try { storage = globalThis.localStorage; } catch { persistent = false; }
  }
  if (!storage) persistent = false;

  function read() {
    if (!persistent) return memory.map(item => ({ ...item }));
    let raw;
    try { raw = storage.getItem(CART_KEY); } catch {
      persistent = false;
      return memory.map(item => ({ ...item }));
    }
    try {
      const data = JSON.parse(raw || "[]");
      const seen = new Set();
      memory = Array.isArray(data) ? data.map(normalizeItem).filter(item => {
        if (!item || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }).slice(0, 100) : [];
    } catch { memory = []; }
    return memory.map(item => ({ ...item }));
  }

  function save(items) {
    memory = items;
    if (persistent) {
      try { storage.setItem(CART_KEY, JSON.stringify(items)); }
      catch { persistent = false; }
    }
    const result = read();
    globalThis.window?.dispatchEvent(new Event("cartchange"));
    return result;
  }

  return {
    read,
    get persistent() { return persistent; },
    add(product, quantity = 1) {
      if (quantity !== 1) throw new Error("Jedes Stück ist nur einmal verfügbar.");
      const item = normalizeItem({ ...product, quantity });
      if (!item) throw new Error("Ungültiger Artikel oder ungültige Menge.");
      const items = read();
      const existing = items.find(entry => entry.id === item.id);
      if (existing) existing.quantity = 1;
      else {
        if (items.length >= 100) throw new Error("Der Warenkorb ist voll.");
        items.push(item);
      }
      return save(items);
    },
    setQuantity(id, quantity) {
      if (quantity !== 1) {
        throw new Error("Jedes Stück ist nur einmal verfügbar.");
      }
      return save(read().map(item => item.id === id ? { ...item, quantity } : item));
    },
    remove(id) { return save(read().filter(item => item.id !== id)); },
  };
}

export function cartTotals(items) {
  return items.reduce((total, item) => ({
    quantity: total.quantity + item.quantity,
    priceCents: total.priceCents === null || item.priceCents === null
      ? null : total.priceCents + item.priceCents * item.quantity,
  }), { quantity: 0, priceCents: 0 });
}

export const cart = createCartStore();
