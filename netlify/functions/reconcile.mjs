export const config = { schedule: '*/10 * * * *' }

export default async function reconcile() {
  const secret = process.env.NUXT_CRON_SECRET
  const site = process.env.URL
  if (!secret || !site) throw new Error('Bestellabgleich: Serverkonfiguration fehlt.')
  const endpoint = new URL('/api/maintenance/reconcile', site)
  if (endpoint.protocol !== 'https:') throw new Error('Bestellabgleich benötigt HTTPS.')
  const response = await fetch(endpoint, {
    headers: { authorization: `Bearer ${secret}` },
    redirect: 'error',
    signal: AbortSignal.timeout(25000)
  })
  if (!response.ok) throw new Error(`Bestellabgleich fehlgeschlagen: HTTP ${response.status}`)
  const { synchronized } = await response.json()
  console.info('Bestellabgleich abgeschlossen:', { synchronized })
}
