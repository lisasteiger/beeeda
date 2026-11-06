<script setup lang="ts">
import { money, type AdminData } from '#shared/shop'
const { data, error, refresh } = await useFetch<AdminData>('/api/admin/shop')
const message = ref('')
const busy = ref(false)
useHead({ title: 'Verwaltung – Beeeda', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })
async function save(product: any) {
  busy.value = true
  try {
    await $fetch('/api/admin/inventory', { method: 'POST', body: { productId: product.productId, onHand: Number(product.onHand), enabled: product.enabled } })
    message.value = 'Bestand gespeichert.'
    await refresh()
  } catch (error: any) { message.value = error.data?.message || 'Speichern fehlgeschlagen.' }
  finally { busy.value = false }
}
</script>
<template><main class="admin-page">
  <h1>Verwaltung</h1><p><a href="/_studio">Produkte und Bilder in Nuxt Studio bearbeiten</a></p>
  <p v-if="error">Bitte zuerst in Nuxt Studio mit deinem GitHub-Konto anmelden. Supabase muss eingerichtet sein.</p>
  <template v-if="data">
    <h2>Warenbestand</h2><p>Bestand ist die noch nicht verkaufte Menge, einschliesslich laufender Reservierungen. Er wird bei einer bestätigten Zahlung automatisch reduziert.</p>
    <form v-for="product in data.products" :key="product.productId" class="inventory-row" @submit.prevent="save(product)">
      <span>{{ product.name }} ({{ product.status }}): {{ product.available }} verfügbar</span>
      <label>Bestand <input v-model="product.onHand" type="number" min="0" max="9999" required /></label>
      <label><input v-model="product.enabled" type="checkbox" /> Verkauf freigeben</label>
      <button :disabled="busy" class="cart-button">Speichern</button>
    </form>
    <p role="status">{{ message }}</p>
    <h2>Bestellungen</h2>
    <article v-for="order in data.orders" :key="order.id" class="admin-order">
      <p>{{ order.id }} · {{ order.status }} · {{ money(order.total_cents) }} · {{ new Date(order.created_at).toLocaleString('de-CH') }}</p>
      <pre>{{ order.items }}</pre><pre v-if="order.customer">{{ order.customer }}</pre>
    </article>
  </template>
</main></template>
<style scoped>
.admin-page { width: min(1000px, calc(100% - 40px)); margin: 0 auto; padding: 180px 0 80px; }
.inventory-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-block: 24px; }
input[type=number] { width: 80px; padding: 8px; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; }
.admin-order { margin-block: 32px; }
</style>

