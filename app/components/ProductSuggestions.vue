<script setup lang="ts">
import type { Product } from '#shared/shop'
defineProps<{ products: Product[] }>()
</script>

<template>
  <div class="product-suggestions">
    <a v-for="item in products" :key="item.productId" class="product-suggestion" :href="'/produkte/' + encodeURIComponent(item.productId)">
      <figure>
        <img :src="item.cover || item.thumbnail || item.hero" alt="" loading="lazy" />
        <figcaption>{{ item.name }}</figcaption>
      </figure>
    </a>
  </div>
</template>

<style scoped>
.product-suggestions { display: flex; flex-wrap: wrap; justify-content: center; gap: 32px 24px; }
.product-suggestion { flex: 0 0 calc((100% - 48px) / 3); min-width: 0; }
figure { margin: 0; }
img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px; }
figcaption { margin-top: 10px; font-size: var(--corner-link-font-size); font-weight: 500; line-height: 1.4; text-align: center; overflow-wrap: anywhere; }
@media (max-width: 700px) {
  .product-suggestions { gap: 24px 12px; }
  .product-suggestion { flex-basis: calc((100% - 24px) / 3); }
}
</style>
