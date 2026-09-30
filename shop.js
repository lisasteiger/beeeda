import { cart, cartTotals, CART_KEY } from "./cart-store.js";
import { pinksChaos } from "./products.js";
import { api } from "./api.js";

const confirmation = document.getElementById("purchase-confirmation");
const buyButton = document.getElementById("buy-button");
let available = true;

async function updateAvailability() {
  if (!buyButton || !document.querySelector(".status")) return;
  try {
    const product = (await api("products")).find(item => item.id === pinksChaos.id);
    available = product?.availability === "available";
    buyButton.disabled = !available || !confirmation.hidden;
    const states = { reserved: "Gerade reserviert", sold: "SOLD", inquiry: "Auf Anfrage" };
    document.querySelector(".status").textContent = available ? "CHF 49.50" : states[product?.availability] || "Nicht verfügbar";
    buyButton.textContent = product?.availability === "inquiry" ? "Auf Anfrage" : "Kaufen";
  } catch { /* The cart also works in the existing static preview. */ }
}

function updateCartLinks() {
  if (confirmation && !confirmation.hidden) return;
  const { quantity } = cartTotals(cart.read());
  for (const link of document.querySelectorAll(".cart-link")) {
    link.textContent = quantity ? `Warenkorb (${quantity})` : "Warenkorb";
  }
}

buyButton?.addEventListener("click", () => {
  buyButton.disabled = true;
  try {
    confirmation.hidden = false;
    cart.add(pinksChaos);
  } catch (error) {
    confirmation.hidden = true;
    buyButton.disabled = false;
    const feedback = document.getElementById("buy-feedback");
    feedback.hidden = false;
    feedback.textContent = error.message;
  }
});

confirmation?.addEventListener("animationend", (event) => {
  if (event.target !== confirmation) return;
  confirmation.hidden = true;
  buyButton.disabled = !available;
  updateCartLinks();
  updateAvailability();
});

window.addEventListener("cartchange", updateCartLinks);
window.addEventListener("pageshow", updateCartLinks);
window.addEventListener("pageshow", updateAvailability);
if (buyButton) {
  updateAvailability();
  setInterval(() => { if (!document.hidden) updateAvailability(); }, 10000);
}
window.addEventListener("storage", (event) => {
  if (event.key === CART_KEY || event.key === null) updateCartLinks();
});
updateCartLinks();
