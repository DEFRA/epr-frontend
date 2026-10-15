const TAG_MANAGER = 'https://www.googletagmanager.com'

/**
 * Where GA4 lives. The container and the measurement library it loads are both
 * served from googletagmanager.com, which the library also beacons diagnostics
 * back to as a fetch, so that host is both a script and a connect source. The
 * container gains nothing by it: a fetch cannot execute, and the frame and
 * nonces it would need to run anything else stay refused.
 */
export const analyticsOrigins = {
  connect: [
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    TAG_MANAGER
  ],
  font: [],
  img: ['https://*.google-analytics.com'],
  script: [TAG_MANAGER],
  style: []
}

/**
 * What the tag manager preview console needs to draw itself over the page, per
 * Google's published list. Only for checking a container, never for visitors.
 */
export const previewOrigins = {
  connect: [],
  font: ['https://fonts.gstatic.com'],
  img: [TAG_MANAGER, 'https://ssl.gstatic.com', 'https://www.gstatic.com'],
  script: ['https://tagmanager.google.com'],
  style: [
    TAG_MANAGER,
    'https://tagmanager.google.com',
    'https://fonts.googleapis.com'
  ]
}
