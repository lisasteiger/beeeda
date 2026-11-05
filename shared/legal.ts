// Bump when the published AGB change; existing reservations keep their version.
export const termsVersion = '2026-11-04'

export function hasTermsAcceptance(input: unknown): boolean {
  const value = input as { termsAccepted?: unknown; termsVersion?: unknown } | null
  return value?.termsAccepted === true && value.termsVersion === termsVersion
}
