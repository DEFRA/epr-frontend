const MEASUREMENT_LIBRARY = 'https://www.googletagmanager.com/gtag/js'

const publishedMeasurementId = () =>
  document
    .querySelector('meta[name="analytics-measurement-id"]')
    ?.getAttribute('content')

/**
 * The measurement library reads its queue off the window, so the name is fixed
 * by the vendor rather than chosen here.
 * @param {unknown[]} entry
 */
const enqueue = (entry) => {
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push(entry)
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
  const measurementId = publishedMeasurementId()

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

  enqueue(['js', new Date()])
  enqueue(['config', measurementId])
}

startAnalytics()
