export const BACK_URL_FLASH = 'cookiesBackUrl'

/**
 * The path and query of a URL on this service, or null for anywhere else. The
 * URL is resolved the way a browser would, so a backslash or a tab cannot pass
 * an off-site address off as a path. Hosts are compared rather than origins,
 * because behind the proxy the request is plain http while the browser is not.
 * @param {unknown} url - a path, or an absolute URL such as a referrer
 * @param {URL} here - the URL of the request being handled
 * @returns {string | null}
 */
export const localPath = (url, here) => {
  if (typeof url !== 'string' || !/^(\/|https?:)/.test(url)) {
    return null
  }

  const resolved = URL.parse(url, here)

  return resolved?.host === here.host
    ? `${resolved.pathname}${resolved.search}`
    : null
}
