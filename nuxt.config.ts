const development = process.env.NODE_ENV !== 'production'
const studioReady = Boolean(process.env.STUDIO_GITHUB_CLIENT_ID && process.env.STUDIO_GITHUB_CLIENT_SECRET && process.env.STUDIO_GITHUB_MODERATORS?.trim())

export default defineNuxtConfig({
  compatibilityDate: '2026-10-07',
  modules: ['@nuxt/content', ...(development || studioReady ? ['nuxt-studio'] : [])],
  devtools: { enabled: false },
  content: { experimental: { sqliteConnector: 'native' } },
  css: ['~/assets/css/home.css', '~/assets/css/subsides.css', '~/assets/css/shop.css', '~/assets/css/cart.css', '~/assets/css/nuxt.css'],
  app: { head: {
    title: 'Beeeda', htmlAttrs: { lang: 'de' },
    meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
    link: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap' }]
  }},
  runtimeConfig: {
    supabaseUrl: '',
    supabaseSecretKey: '', stripeSecretKey: '', stripeWebhookSecret: '', cronSecret: '',
    public: { siteUrl: 'https://beeeda.ch' }
  },
  studio: {
    dev: development,
    route: '/_studio',
    media: { allowedTypes: ['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml'] },
    repository: { provider: 'github', owner: 'lisasteiger', repo: 'Beeeda', branch: 'branch1' },
    i18n: { defaultLocale: 'de' }
  },
  hooks: {
    'nitro:config'(config) {
      // Studio reads these from process.env at runtime; keep credentials out of build artifacts.
      const github = (config.runtimeConfig as any)?.studio?.auth?.github
      if (github) {
        github.clientId = ''
        github.clientSecret = ''
      }
    }
  },
  routeRules: {
    '/index.html': { redirect: '/' },
    '/pinkchaos.html': { redirect: '/produkte/pinks-chaos' },
    '/produkt02.html': { redirect: '/produkt02' },
    '/warenkorb.html': { redirect: '/warenkorb' },
    '/kasse.html': { redirect: '/kasse' },
    '/impressum.html': { redirect: '/impressum' },
    '/ueber-uns.html': { redirect: '/ueber-uns' },
    '/ruecksendungen.html': { redirect: '/ruecksendungen' },
    '/api/**': { headers: { 'Cache-Control': 'no-store' } }
  }
})
