import { database, owner } from './shop'
export async function currentOrder(event: Parameters<typeof owner>[0]) {
  const id = getCookie(event, 'beeeda-active-order')
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) return null
  const { data, error } = await database(event).from('orders').select('*').eq('id', id).eq('owner_hash', owner(event)).maybeSingle()
  if (error) throw createError({ statusCode: 503, message: 'Die Reservierung konnte nicht geladen werden.' })
  return data
}

