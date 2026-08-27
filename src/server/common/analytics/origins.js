/**
 * Where GA4 lives. gtag.js is served from googletagmanager.com even when Tag
 * Manager itself is not in play, and the analytics endpoints receive the
 * measurements.
 */
export const analyticsOrigins = {
  connect: ['https://*.google-analytics.com', 'https://*.analytics.google.com'],
  img: ['https://*.google-analytics.com'],
  script: ['https://www.googletagmanager.com']
}
