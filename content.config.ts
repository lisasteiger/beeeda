import { defineCollection, defineContentConfig, z } from '@nuxt/content'
export default defineContentConfig({
  collections: {
    products: defineCollection({
      type: 'data', source: 'products/*.json',
      schema: z.object({
        productId: z.string().regex(/^[a-z0-9-]+$/).editor({ label: 'Produkt-ID (nach erster Bestellung nicht ändern)' }),
        name: z.string().min(1).editor({ label: 'Name' }),
        displayOrder: z.number().multipleOf(1).default(0).describe('Reihenfolge im Carousel und beim nächsten Produkt: kleinere Zahlen zuerst (1, 2, 3 …).').editor({ label: 'Reihenfolge' }),
        size: z.string().default('').editor({ label: 'Grösse auf der Startseite (z. B. 6–9 M oder S)' }),
        status: z.enum(['draft', 'active', 'archived']).default('draft').editor({ label: 'Entwurf / im Shop / verkauft (archived)' }),
        reduced: z.boolean().default(false).describe('Zeigt nur die Markierung „reduziert“ im Carousel. Preis und Kaufmöglichkeit bleiben unverändert.').editor({ label: 'Reduziert' }),
        priceCents: z.number().multipleOf(1).min(0).editor({ label: 'Preis in Rappen (4960 = CHF 49.60)' }),
        stockQuantity: z.number().multipleOf(1).min(0).max(9999).nullable().default(null).describe('Gesamtanzahl inklusive bereits verkaufter Stücke. Leer = Einzelstück (1). Für Nachschub die Gesamtanzahl erhöhen. Bestehende Supabase-Bestände bleiben bei leerem Feld unverändert, bis hier erstmals eine Zahl gesetzt wird.').editor({ label: 'Anzahl insgesamt' }),
        shippingClass: z.enum(['small', 'large']).default('large').editor({ label: 'Versand: small = CHF 2, large = CHF 9' }),
        description: z.string().editor({ label: 'Beschreibung', input: 'textarea' }),
        materials: z.string().editor({ label: 'Material' }),
        measurements: z.string().editor({ label: 'Masse' }),
        care: z.string().default('').editor({ label: 'Pflege' }),
        relatedProducts: z.array(z.string()).max(3).default([]).describe('Optional: bis zu drei Produkt-IDs für die kleinen Empfehlungen unter Kaufen. Leer lassen, um den Bereich auszublenden.').editor({ label: 'Passende Produkte unter Kaufen' }),
        cover: z.string().editor({ label: 'Bild Startseite', input: 'media' }),
        hero: z.string().editor({ label: 'Hauptbild', input: 'media' }),
        thumbnail: z.string().editor({ label: 'Bild Warenkorb', input: 'media' }),
        archiveImage: z.string().editor({ label: 'Zusätzliches Produktbild', input: 'media' }),
        gallery: z.array(z.string().editor({ input: 'media' })).editor({ label: 'Weitere Bilder' })
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
