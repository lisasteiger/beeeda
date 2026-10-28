<script setup lang="ts">
const { count, subtotal, shipping, money } = useCart()
defineProps<{ checkout?: boolean }>()
</script>
<template>
  <aside class="cart-summary" aria-label="Deine Bestellung">
    <dl><div><dt>Artikel</dt><dd>{{ count }}</dd></div><div><dt>Zahlungsart</dt><dd>Stripe · TWINT und weitere</dd></div><div><dt>Versand</dt><dd>{{ money(shipping) }}</dd></div><div class="cart-total"><dt>Artikelsumme</dt><dd>{{ money(subtotal) }}</dd></div><div><dt>Gesamtsumme</dt><dd>{{ money(subtotal + shipping) }}</dd></div></dl>
    <p class="cart-note">Versand innerhalb der Schweiz.</p>
    <slot><a v-if="!checkout" class="cart-button" href="/kasse">Zur Kasse</a></slot>
  </aside>
</template>

