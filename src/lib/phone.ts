// Very small US-centric phone helpers.
// If you need multi-country later, swap to libphonenumber-js.

export function normalizeUSPhone(input: string): string | null {
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  if (/^\+\d{8,15}$/.test(input)) return input // already E.164-ish
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  return null
}

export function altFormsForLookup(e164ish: string): string[] {
  // For matching legacy rows that may be stored as 10 digits or 11 without +
  const d = e164ish.replace(/\D/g, '')
  const out = new Set<string>()
  out.add(e164ish)
  if (d.startsWith('1') && d.length === 11) {
    out.add(d)           // "1XXXXXXXXXX"
    out.add(d.slice(1))  // "XXXXXXXXXX"
  }
  return [...out]
}
