import { defineCollection, defineContentConfig, z } from '@nuxt/content'
export default defineContentConfig({
  collections: {
    products: defineCollection({
      type: 'data', source: 'products/*.json',
      schema: z.object({
        productId: z.string().regex(/^[a-z0-9-]+$/).editor({ label: 'Produkt-ID (nach erster Bestellung nicht ändern)' }),
        name: z.string().min(1).editor({ label: 'Name' }),
        size: z.string().default('').editor({ label: 'Grösse auf der Startseite (z. B. 6–9 M oder S)' }),
        status: z.enum(['draft', 'active', 'archived']).default('draft').editor({ label: 'Entwurf / im Shop / verkauft (archived)' }),
        priceCents: z.number().multipleOf(1).min(0).editor({ label: 'Preis in Rappen (4960 = CHF 49.60)' }),
        shippingClass: z.enum(['small', 'large']).default('large').editor({ label: 'Versand: small = CHF 2, large = CHF 9' }),
        description: z.string().editor({ label: 'Beschreibung', input: 'textarea' }),
        materials: z.string().editor({ label: 'Material' }),
        measurements: z.string().editor({ label: 'Masse' }),
        care: z.string().default('').editor({ label: 'Pflege' }),
        cover: z.string().editor({ label: 'Bild Startseite', input: 'media' }),
        hero: z.string().editor({ label: 'Hauptbild', input: 'media' }),
        thumbnail: z.string().editor({ label: 'Bild Warenkorb', input: 'media' }),
        archiveImage: z.string().editor({ label: 'Zusätzliches Produktbild', input: 'media' }),
        gallery: z.array(z.string().editor({ input: 'media' })).editor({ label: 'Weitere Bilder' }),
        displayOrder: z.number().multipleOf(1).default(0).editor({ label: 'Reihenfolge' })
      })
    }),
    site: defineCollection({
      type: 'data', source: 'site.json',
      schema: z.object({
        brand: z.string(), email: z.string().email(),
        businessName: z.string(), street: z.string(), postalCode: z.string(), city: z.string(),
        about: z.string().editor({ label: 'Über uns', input: 'textarea' })
      })
    })
  }
})
