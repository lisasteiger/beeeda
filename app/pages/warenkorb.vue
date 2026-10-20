<script setup lang="ts">
const { ready, catalog, items, lines, quantity, remove, money, refresh } = useCart()
useHead({ title: 'Warenkorb – Beeeda' })
onMounted(() => refresh())
</script>
<template>
  <main class="cart-page">
    <header class="cart-heading"><h1>Warenkorb</h1></header>
    <div v-if="ready && lines.length" id="cart-filled" class="cart-layout">
      <section aria-label="Artikel im Warenkorb"><ul id="cart-items" class="cart-items">
        <li v-for="item in items" :key="item.productId" class="cart-item">
          <img class="cart-item-image" :src="item.thumbnail" :alt="item.name" />
          <div class="cart-item-details"><h2><a class="cart-item-name" :href="'/produkte/' + item.productId">{{ item.name }}</a></h2><p class="cart-unit-price">{{ money(item.priceCents) }} / Stück</p>
            <div class="cart-item-actions"><label>Menge <input class="cart-quantity" type="number" min="1" :max="item.available ?? 99" :value="item.quantity" :readonly="item.available === 1" @change="quantity(item.productId, Number(($event.target as HTMLInputElement).value))" /></label><button class="cart-remove" @click="remove(item.productId)">Entfernen</button></div>
            <p v-if="item.available === 0 || (item.available !== null && item.available !== undefined && item.quantity > item.available)" class="cart-message">Diese Menge ist nicht mehr verfügbar.</p>
          </div><p class="cart-line-total">{{ money(item.priceCents * item.quantity) }}</p>
        </li>
      </ul>
      <p v-if="items.length < lines.length" class="cart-message">Ein Produkt ist nicht mehr im Shop. <button class="cart-remove" @click="lines = lines.filter(line => items.some(item => item.productId === line.productId))">Warenkorb aktualisieren</button></p>
      </section>
      <CartSummary><a class="cart-button" href="/kasse">Zur Kasse</a><p v-if="!catalog?.checkoutReady" class="cart-note">Der Online-Kauf wird gerade eingerichtet.</p></CartSummary>
    </div>
    <div v-else-if="ready" class="cart-empty"><p>Dein Warenkorb ist leer.</p><a class="cart-button" href="/">Weiterstöbern</a></div>
  </main>
</template>

