import { useSession, getCookie, getRequestProtocol, type H3Event } from 'h3'
export async function requireShopAdmin(event: H3Event) {
  const studio = (useRuntimeConfig(event) as any).studio
  const moderators = (process.env.STUDIO_GITHUB_MODERATORS || '').split(',').map(email => email.trim()).filter(Boolean)
  if (!process.env.STUDIO_GITHUB_CLIENT_ID || !process.env.STUDIO_GITHUB_CLIENT_SECRET || !studio?.auth?.sessionSecret || !moderators.length || !getCookie(event, 'studio-session')) {
    throw createError({ statusCode: 401, message: 'Bitte zuerst mit deinem GitHub-Konto in Nuxt Studio anmelden.' })
  }
  const session = await useSession(event, {
    name: 'studio-session', password: studio.auth.sessionSecret,
    cookie: { secure: getRequestProtocol(event) === 'https', path: '/' }
  })
  const user = session.data.user
  if (!user || user.provider !== 'github' || !moderators.includes(user.email)) {
    throw createError({ statusCode: 403, message: 'Zugriff nicht erlaubt.' })
  }
}
