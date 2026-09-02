const MEASUREMENT_LIBRARY = 'https://www.googletagmanager.com/gtag/js'

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
 * The measurement library reads an `arguments` object as a command and anything
 * else as a plain data push, and only a non-arrow function produces one.
 */
const asCommand = function () {
  return arguments
}

/**
 * The queue lives on the window under a name fixed by the vendor, and the
 * library adopts whatever it finds there once loaded.
 * @param {...unknown} command
 */
const gtag = (...command) => {
  window.dataLayer ??= []
  window.dataLayer.push(asCommand(...command))
}

/**
 * @param {string} src
 */
const alreadyLoaded = (src) =>
  document.querySelector(`script[src="${src}"]`) !== null

/**
 * Starts reporting to the analytics property the page names, if it names one.
 * Only a page rendered after consent carries that name, so an absent id means
 * consent was refused or never asked, and nothing should load.
 */
export const startAnalytics = () => {
  const measurementId = published('analytics-measurement-id')

  if (!measurementId) {
    return
  }

  const src = `${MEASUREMENT_LIBRARY}?id=${measurementId}`

  if (alreadyLoaded(src)) {
    return
  }

  const tag = document.createElement('script')
  tag.async = true
  tag.src = src
  document.head.appendChild(tag)

  gtag('js', new Date())
  gtag('config', measurementId, reportedPage())
}

startAnalytics()
