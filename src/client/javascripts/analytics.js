const CONTAINER_LIBRARY = 'https://www.googletagmanager.com/gtm.js'

/**
 * Tag types the container may never run, whatever its editors publish: custom
 * code, custom pixels and anything not built by Google. Policies cannot see
 * Custom HTML, so this list is what keeps it out.
 */
const BLOCKED_TAG_CLASSES = [
  'customScripts',
  'html',
  'customPixels',
  'jsm',
  'nonGoogleScripts',
  'nonGooglePixels',
  'nonGoogleIframes'
]

/**
 * Consent was given before this script was ever served, so analytics storage is
 * granted. Advertising was never asked about, so it stays denied.
 */
const CONSENT = {
  ad_personalization: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  analytics_storage: 'granted'
}

/**
 * @param {string} name
 */
const published = (name) =>
  document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')

/**
 * @param {string} step
 */
const asAddress = (step) => new URL(step, window.location.origin).href

/**
 * The page reports the step it is and the step it came from, not the addresses
 * either was reached at. Journey addresses carry identifiers, so reporting them
 * would scatter one step across thousands of values and hand those identifiers
 * to a third party. A page publishes no referrer when the visitor came from
 * another site, and the measurement library then reads it itself -- that is how
 * they arrived, and it carries nothing of ours.
 */
const reportedPage = () => {
  const cameFrom = published('analytics-page-referrer')

  return {
    page_location: asAddress(published('analytics-page-path') ?? '/'),
    ...(cameFrom === undefined ? {} : { page_referrer: asAddress(cameFrom) })
  }
}

/**
 * Everything the container does on the page asks this first. It may report
 * page views to the property the page names and nothing else: no other tag, no
 * reading the address or the page, no listening for clicks, forms or scrolling,
 * and nothing it has not asked for before.
 * @param {{ containerId: string, measurementId: string }} published
 * @returns {(requestedBy: string, permission: string, data?: { key?: string, tagId?: string }) => boolean}
 */
export const tagPolicy =
  ({ containerId, measurementId }) =>
  (requestedBy, permission, data) => {
    if (requestedBy !== containerId && requestedBy !== measurementId) {
      return false
    }

    switch (permission) {
      case 'read_event_data':
      case 'read_container_data':
      case 'access_template_storage':
        return true
      case 'read_data_layer':
        return data?.key?.startsWith('gtm.') ?? false
      case 'load_google_tags':
      case 'configure_google_tags':
        return data?.tagId === undefined || data.tagId === measurementId
      default:
        return false
    }
  }

/**
 * The queue lives on the window under a name fixed by the vendor, and the
 * container adopts whatever it finds there once loaded.
 * @param {unknown} entry
 */
const queue = (entry) => {
  window.dataLayer ??= []
  window.dataLayer.push(entry)
}

/**
 * The measurement library reads an `arguments` object as a command and anything
 * else as a plain data push, and only a non-arrow function produces one.
 */
const asCommand = function () {
  return arguments
}

/**
 * @param {...unknown} command
 */
const gtag = (...command) => queue(asCommand(...command))

/**
 * @param {string} src
 */
const alreadyLoaded = (src) =>
  document.querySelector(`script[src="${src}"]`) !== null

/**
 * Starts reporting through the container the page names, to the property it
 * names. Only a page rendered after consent carries those names, so an absent
 * id means consent was refused or never asked, and nothing should load. The
 * controls are queued before the container, which reads the queue in order.
 */
export const startAnalytics = () => {
  const containerId = published('analytics-container-id')
  const measurementId = published('analytics-measurement-id')

  if (!containerId || !measurementId) {
    return
  }

  const src = `${CONTAINER_LIBRARY}?id=${containerId}`

  if (alreadyLoaded(src)) {
    return
  }

  queue({ 'gtm.blocklist': BLOCKED_TAG_CLASSES })
  gtag('policy', 'all', tagPolicy({ containerId, measurementId }))
  gtag('consent', 'default', CONSENT)
  gtag('set', reportedPage())
  queue({ 'gtm.start': Date.now(), event: 'gtm.js' })

  const tag = document.createElement('script')
  tag.async = true
  tag.src = src
  document.head.appendChild(tag)
}

startAnalytics()
