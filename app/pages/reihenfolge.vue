<script setup lang="ts">
if (!import.meta.dev) throw createError({ statusCode: 404 })
type Entry = { productId: string; name: string; status: string; cover: string; hero: string; gallery: string[]; revision: string }
const { data, refresh, error: loadError } = await useFetch<Entry[]>('/api/local/reihenfolge', { server: false })
const products = ref<Entry[]>([])
const originals = ref<Entry[]>([])
function reset() {
  products.value = structuredClone(toRaw(data.value || []))
  originals.value = structuredClone(toRaw(data.value || []))
}
watch(data, reset, { immediate: true })
const selected = ref('')
const current = computed(() => products.value.find(product => product.productId === selected.value))
const images = computed(() => current.value ? [current.value.hero, ...current.value.gallery] : [])
const message = ref('')
const saving = ref(false)
const changed = computed(() => JSON.stringify(products.value) !== JSON.stringify(originals.value))
function move<T>(items: T[], index: number, direction: number) {
  const target = index + direction
  if (target < 0 || target >= items.length) return
  items.splice(target, 0, items.splice(index, 1)[0]!)
  message.value = ''
}
function moveImage(index: number, direction: number) {
  if (!current.value) return
  const list = [...images.value]
  move(list, index, direction)
  current.value.hero = list[0]!
  current.value.gallery = list.slice(1)
}
async function save() {
  saving.value = true
  message.value = ''
  try {
    const orderChanged = products.value.some((product, index) => product.productId !== originals.value[index]?.productId)
    const changes = products.value.flatMap((product, index) => {
      const before = originals.value.find(item => item.productId === product.productId)!
      const imagesChanged = product.hero !== before.hero || JSON.stringify(product.gallery) !== JSON.stringify(before.gallery)
      return orderChanged || imagesChanged ? [{ productId: product.productId, revision: before.revision, ...(orderChanged ? { displayOrder: index + 1 } : {}), ...(imagesChanged ? { images: [product.hero, ...product.gallery] } : {}) }] : []
    })
    await $fetch('/api/local/reihenfolge', { method: 'POST', body: { changes } })
    await refresh()
    reset()
    message.value = 'Lokal gespeichert. Zum Veröffentlichen in GitHub Desktop committen und pushen.'
  } catch (error: any) {
    message.value = error.data?.message || 'Speichern fehlgeschlagen. Bitte nochmals versuchen.'
  } finally { saving.value = false }
}
useHead({ title: 'Reihenfolge – Beeeda' })
</script>
<template>
  <main class="sorting">
    <h1>Reihenfolge bearbeiten</h1>
    <nav><a href="/_studio">Studio öffnen</a> · <a href="/" target="_blank">Vorschau öffnen</a></nav>
    <p>Mit ↑ und ↓ verschieben. Der zufällige Start im Carousel bleibt erhalten; die Produkte folgen danach dieser Reihenfolge. Entwürfe erscheinen erst, wenn sie im Shop aktiv sind.</p>
    <button :disabled="!changed || saving" @click="save">{{ saving ? 'Wird gespeichert …' : 'Reihenfolge speichern' }}</button>
    <p role="status">{{ loadError ? 'Produkte konnten nicht geladen werden. Bitte die Seite neu laden.' : message }}</p>
    <div class="sorting-columns">
      <section aria-labelledby="carousel-order">
        <h2 id="carousel-order">Carousel</h2>
        <ol>
          <li v-for="(product, index) in products" :key="product.productId">
            <img :src="product.cover || product.hero" alt="" />
            <button class="select-product" :aria-pressed="selected === product.productId" @click="selected = product.productId">{{ product.name }}<small v-if="product.status === 'draft'">Entwurf</small></button>
            <button :disabled="index === 0 || saving" :aria-label="product.name + ' nach oben'" @click="move(products, index, -1)">↑</button>
            <button :disabled="index === products.length - 1 || saving" :aria-label="product.name + ' nach unten'" @click="move(products, index, 1)">↓</button>
          </li>
        </ol>
      </section>
      <section aria-labelledby="gallery-order">
        <h2 id="gallery-order">Galeriebilder{{ current ? ': ' + current.name : '' }}</h2>
        <p v-if="!current">Links ein Produkt anklicken, um seine Bilder zu sortieren.</p>
        <p v-else>Das oberste Bild ist das Hauptbild der Produktseite. Das Carousel-Bild bleibt unverändert.</p>
        <ol>
          <li v-for="(image, index) in images" :key="index">
            <img :src="image" :alt="'Bild ' + (index + 1)" />
            <span>{{ index === 0 ? 'Hauptbild' : 'Bild ' + (index + 1) }}</span>
            <button :disabled="index === 0 || saving" :aria-label="'Bild ' + (index + 1) + ' nach oben'" @click="moveImage(index, -1)">↑</button>
            <button :disabled="index === images.length - 1 || saving" :aria-label="'Bild ' + (index + 1) + ' nach unten'" @click="moveImage(index, 1)">↓</button>
          </li>
        </ol>
      </section>
    </div>
  </main>
</template>
<style scoped>
.sorting{max-width:1100px;margin:0 auto;padding:36px 24px;color:#000;background:#fff;min-height:100dvh;font-size:16px}
h1{font-size:28px}h2{font-size:21px;margin:24px 0}p{line-height:1.5}nav{margin:20px 0}.sorting-columns{display:grid;grid-template-columns:1fr 1fr;gap:36px}ol{list-style:none;padding:0}li{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #ddd}li img{width:72px;height:72px;object-fit:contain;border-radius:8px}li span,.select-product{flex:1;text-align:left}button{border:1px solid #bbb;background:#fff;color:#000;border-radius:8px;padding:10px;cursor:pointer;font:inherit}button:disabled{opacity:.4;cursor:default}button[aria-pressed=true]{background:#eee}small{display:block;color:#737373}li button:not(.select-product){min-width:44px}a{color:#000}@media(max-width:700px){.sorting-columns{grid-template-columns:1fr}.sorting{padding:24px 16px}}
</style>
