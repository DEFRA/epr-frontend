/**
 * Where GA4 lives. gtag.js is served from googletagmanager.com even when Tag
 * Manager itself is not in play, and beacons its diagnostics back there as a
 * fetch, so that host is both a script and a connect source. Tag Manager gains
 * nothing by it: a fetch cannot execute, and the frame and nonces it needs stay
 * refused.
 */
export const analyticsOrigins = {
  connect: [
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://www.googletagmanager.com'
  ],
  img: ['https://*.google-analytics.com'],
  script: ['https://www.googletagmanager.com']
}
