export const pinksChaos = {
  id: "pinks-chaos",
  name: "Pinks Chaos",
  priceCents: 4960,
  stock: 1, // Gesamtbestand; bereits verkaufte Stücke werden davon abgezogen.
  shippingClass: "small", // "small" = CHF 2, "large" = CHF 9.
  image: "assets/01_2.jpg",
  href: "pinkchaos.html",
  // Nach dem Verkauf: "sold" oder "inquiry" (Anfrage).
  afterSale: "sold",
};

export const products = [pinksChaos];

// Versandpreise in Rappen. Ab zwei Stück immer die grosse Klasse.
export const shippingRates = { small: 200, large: 900 };
export function shippingCents(items) {
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  if (!quantity) return 0;
  return quantity >= 2 || items.some(item => item.shippingClass !== "small")
    ? shippingRates.large : shippingRates.small;
}
