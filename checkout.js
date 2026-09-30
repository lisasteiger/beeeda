import { api } from "./api.js";
import { cart } from "./cart-store.js";

const money = cents => new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" }).format(cents / 100);
const form = document.getElementById("checkout-form");
const message = document.getElementById("checkout-message");
const payment = document.getElementById("payment-step");
let current, selected = [], requestKey;
let timer;

function summary(items) {
  const list = document.getElementById("checkout-items");
  list.replaceChildren();
  for (const item of items) {
    const row = document.createElement("li");
    row.textContent = `${item.name} · 1 Stück · ${money(item.priceCents)}`;
    list.append(row);
  }
  document.getElementById("checkout-total").textContent = money(items.reduce((sum, item) => sum + item.priceCents, 0));
}

function showOrder(order) {
  current = order;
  clearInterval(timer);
  summary(order.items);
  form.hidden = true;
  payment.hidden = order.status !== "reserved";
  const result = document.getElementById("order-result");
  result.hidden = order.status === "reserved";
  message.textContent = "";
  if (order.status === "reserved") {
    const customer = order.customer;
    document.getElementById("customer-summary").textContent = `${customer.firstName} ${customer.lastName}, ${customer.street}, ${customer.postalCode} ${customer.city}, ${customer.country} · ${customer.email}`;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((order.expires - Date.now()) / 1000));
      document.getElementById("reservation-note").textContent = `Reserviert für ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} Minuten.`;
      if (!seconds) {
        clearInterval(timer);
        document.getElementById("confirm-payment").disabled = true;
        api(`orders/${order.id}`).then(showOrder).catch(error => { message.textContent = error.message; });
      }
    };
    tick(); timer = setInterval(tick, 1000);
  } else {
    try { sessionStorage.removeItem("beeeda.checkout"); } catch { /* Storage is optional. */ }
    const paid = order.status === "test-paid";
    document.getElementById("result-title").textContent = paid ? "Testkauf abgeschlossen" : order.status === "expired" ? "Reservierung abgelaufen" : "Reservierung abgebrochen";
    document.getElementById("result-description").textContent = paid ? "Kein Geld wurde abgebucht. Deine Testbestellung ist lokal gespeichert und die Stücke sind im lokalen Bestand verkauft." : "Die Stücke sind wieder freigegeben, sofern sie nicht inzwischen jemand anderes reserviert hat.";
    document.getElementById("order-reference").textContent = `Testbestellung: ${order.id}`;
    if (paid) for (const item of order.items) cart.remove(item.id);
    result.focus();
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  message.textContent = "Verfügbarkeit wird geprüft …";
  try {
    const order = await api("orders", { customer: Object.fromEntries(new FormData(form)), items: selected.map(item => ({ id: item.id, quantity: 1 })), requestKey });
    history.replaceState(null, "", `kasse.html?order=${order.id}`);
    showOrder(order);
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

for (const [id, action] of [["confirm-payment", "confirm"], ["cancel-payment", "cancel"]]) {
  document.getElementById(id).addEventListener("click", async () => {
    for (const button of payment.querySelectorAll("button")) button.disabled = true;
    try { showOrder(await api(`orders/${current.id}/${action}`, {})); }
    catch (error) {
      message.textContent = error.message;
      try { showOrder(await api(`orders/${current.id}`)); } catch { /* Keep the original error visible. */ }
    } finally { for (const button of payment.querySelectorAll("button")) button.disabled = false; }
  });
}

async function init() {
  try {
    const orderId = new URLSearchParams(location.search).get("order");
    if (orderId) return showOrder(await api(`orders/${encodeURIComponent(orderId)}`));
    const pending = await api("pending-order");
    if (pending) {
      history.replaceState(null, "", `kasse.html?order=${pending.id}`);
      return showOrder(pending);
    }
    const catalog = await api("products");
    const items = cart.read();
    if (!items.length) { message.textContent = "Dein Warenkorb ist leer. Wähle zuerst ein Stück im Shop aus."; return; }
    selected = items.map(item => catalog.find(product => product.id === item.id));
    if (selected.some(item => !item || item.availability !== "available")) {
      message.textContent = "Ein Stück ist inzwischen reserviert oder verkauft. Bitte entferne es aus dem Warenkorb oder versuche es später erneut.";
      summary(selected.filter(Boolean));
      return;
    }
    summary(selected);
    // Gleiche Kennung bei Netzfehlern oder Neuladen: keine doppelte Bestellung.
    const signature = selected.map(item => item.id).sort().join(",");
    try {
      const saved = JSON.parse(sessionStorage.getItem("beeeda.checkout") || "null");
      requestKey = saved?.signature === signature ? saved.key : crypto.randomUUID();
      sessionStorage.setItem("beeeda.checkout", JSON.stringify({ signature, key: requestKey }));
    } catch { requestKey = crypto.randomUUID(); }
    form.hidden = false;
  } catch (error) { message.textContent = error.message; }
}
init();
