import { CART_KEY, CURRENCY, cart, cartTotals } from "./cart-store.js";

const format = new Intl.NumberFormat("de-CH", { style: "currency", currency: CURRENCY });
const money = cents => cents === null ? "Preis folgt" : format.format(cents / 100);
const list = document.getElementById("cart-items");
const template = document.getElementById("cart-item-template");
const message = document.getElementById("cart-message");

function render() {
  const items = cart.read();
  document.getElementById("cart-empty").hidden = items.length > 0;
  document.getElementById("cart-filled").hidden = items.length === 0;
  document.getElementById("storage-notice").hidden = cart.persistent;
  list.replaceChildren();

  for (const item of items) {
    const row = template.content.firstElementChild.cloneNode(true);
    row.dataset.id = item.id;
    const name = row.querySelector(".cart-item-name");
    name.textContent = item.name;
    if (item.href) name.href = item.href;
    const image = row.querySelector(".cart-item-image");
    if (item.image) image.src = item.image;
    else image.hidden = true;
    row.querySelector(".cart-unit-price").textContent = item.priceCents === null
      ? "Preis noch nicht festgelegt" : `${money(item.priceCents)} / Stück`;
    row.querySelector(".cart-line-total").textContent = money(
      item.priceCents === null ? null : item.priceCents * item.quantity
    );
    const quantity = row.querySelector(".cart-quantity");
    quantity.value = item.quantity;
    quantity.setAttribute("aria-label", `Menge für ${item.name}`);
    row.querySelector(".cart-remove").setAttribute("aria-label", `${item.name} entfernen`);
    list.append(row);
  }

  const total = cartTotals(items);
  document.getElementById("cart-count").textContent = total.quantity;
  document.getElementById("cart-total").textContent = money(total.priceCents);
}

list.addEventListener("change", event => {
  if (!event.target.matches(".cart-quantity")) return;
  const input = event.target;
  const id = input.closest(".cart-item").dataset.id;
  const item = cart.read().find(item => item.id === id);
  if (!item) return render();
  if (!input.validity.valid || !Number.isInteger(input.valueAsNumber)) {
    input.value = item.quantity;
    message.textContent = "Jedes Stück ist nur einmal verfügbar.";
    return;
  }
  cart.setQuantity(id, input.valueAsNumber);
  const quantity = input.valueAsNumber;
  render();
  // Nach dem Neurendern bleibt die Tastaturbedienung an derselben Stelle.
  [...list.children].find(row => row.dataset.id === id)?.querySelector("input").focus();
  message.textContent = `Menge für ${item.name}: ${quantity}. Warenkorb aktualisiert.`;
});

list.addEventListener("click", event => {
  const button = event.target.closest(".cart-remove");
  if (!button) return;
  const row = button.closest(".cart-item");
  const index = [...list.children].indexOf(row);
  const name = row.querySelector(".cart-item-name").textContent;
  cart.remove(row.dataset.id);
  render();
  const next = list.children[Math.min(index, list.children.length - 1)];
  (next?.querySelector(".cart-remove") || document.querySelector("#cart-empty a")).focus();
  message.textContent = `${name} wurde aus dem Warenkorb entfernt.`;
});

// Änderungen aus anderen offenen Shop-Tabs ebenfalls anzeigen.
window.addEventListener("storage", event => {
  if (event.key === CART_KEY || event.key === null) render();
});
window.addEventListener("pageshow", render);
render();
