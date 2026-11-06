export function validImageOrder(original: unknown[], reordered: unknown): reordered is string[] {
  return Array.isArray(reordered) && reordered.every(image => typeof image === 'string') &&
    JSON.stringify([...reordered].sort()) === JSON.stringify([...original].sort())
}
