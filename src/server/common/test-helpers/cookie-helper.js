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

/**
 * A `Cookie` request header carrying one named cookie, taken from the response
 * that set it rather than assembled by hand, so a test proves the value the app
 * writes is the value it later reads. Empty when the response set no such
 * cookie.
 * @param {string | string[] | undefined} setCookieHeader
 * @param {string} name
 * @returns {string}
 */
export function cookieHeaderFor(setCookieHeader, name) {
  return (
    extractCookieValues(setCookieHeader).find((value) =>
      value.startsWith(`${name}=`)
    ) ?? ''
  )
}
