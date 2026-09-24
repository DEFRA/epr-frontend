/**
 * Extract cookie key=value pairs from Set-Cookie header(s)
 * @param {string | string[] | undefined} setCookieHeader
 * @returns {string[]}
 */
export function extractCookieValues(setCookieHeader) {
  if (!setCookieHeader) return []
  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader]
  return headers.filter(Boolean).map((header) => header.split(';')[0])
}

/**
 * The Set-Cookie header, attributes included, that sets the named cookie
 * @param {string | string[] | undefined} setCookieHeader
 * @param {string} name
 * @returns {string | undefined}
 */
export function findSetCookie(setCookieHeader, name) {
  return [setCookieHeader ?? []]
    .flat()
    .find((header) => header.startsWith(`${name}=`))
}

/**
 * Merge cookie strings, with later values overriding earlier ones
 * @param {...string} cookieStrings
 * @returns {string}
 */
export function mergeCookies(...cookieStrings) {
  const cookies = {}
  for (const str of cookieStrings) {
    if (!str) continue
    for (const part of str.split(';')) {
      const [key, ...valueParts] = part.trim().split('=')
      if (key && valueParts.length > 0) {
        cookies[key] = valueParts.join('=')
      }
    }
  }
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}
