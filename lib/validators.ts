// Mexican RFC. 13 chars for persona física, 12 for persona moral; homoclave optional.
export const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}(?:[A-Z\d]{3})?$/

export function isValidRFC(rfc: string): boolean {
  return RFC_REGEX.test(rfc.toUpperCase().trim())
}

// CLABE interbancaria: 18 digits with a weighted [3,7,1] mod-10 check on digits 1–17.
export function isValidCLABE(clabe: string): boolean {
  const c = clabe.replace(/\s/g, "")
  if (!/^\d{18}$/.test(c)) return false
  const weights = [3, 7, 1]
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += (Number(c[i]) * weights[i % 3]) % 10
  }
  const check = (10 - (sum % 10)) % 10
  return check === Number(c[17])
}
