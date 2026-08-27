import Blankie from 'blankie'
import { config } from '#config/config.js'
import { isAnalyticsEnabled } from '#server/common/analytics/enabled.js'

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */

/**
 * @typedef {{
 *   defaultSrc?: string[]
 *   fontSrc?: string[]
 *   connectSrc?: string[]
 *   mediaSrc?: string[]
 *   styleSrc?: string[]
 *   scriptSrc?: string[]
 *   imgSrc?: string[]
 *   frameSrc?: string[]
 *   objectSrc?: string[]
 *   frameAncestors?: string[]
 *   formAction?: string[]
 *   manifestSrc?: string[]
 *   generateNonces?: boolean
 * }} BlankieOptions
 */

// Supports a GOV.UK Frontend script bundled within Nunjucks macros
// https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy
const govukInlineScriptHash =
  "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"

// gtag.js is served from googletagmanager.com even when Tag Manager itself is
// not in play. The GA4 endpoints receive the measurements.
const analyticsScriptSrc = ['https://www.googletagmanager.com']
const analyticsConnectSrc = [
  'https://*.google-analytics.com',
  'https://*.analytics.google.com'
]
const analyticsImgSrc = ['https://*.google-analytics.com']

export function cspFormAction({ isProduction }) {
  return isProduction ? ['self'] : ['self', 'localhost:*']
}

/**
 * Neither frameSrc nor generateNonces widen for analytics: the frame source
 * exists for a Tag Manager noscript iframe, and nonce propagation for tags
 * injected at runtime. Both are Tag Manager costs, and gtag.js alone incurs
 * neither.
 * @param {{ allowAnalytics: boolean, isProduction: boolean }} options
 * @returns {BlankieOptions}
 */
export const cspOptions = ({ allowAnalytics, isProduction }) => ({
  defaultSrc: ['self'],
  fontSrc: ['self', 'data:'],
  connectSrc: [
    'self',
    'wss',
    'data:',
    ...(allowAnalytics ? analyticsConnectSrc : [])
  ],
  mediaSrc: ['self'],
  styleSrc: ['self'],
  scriptSrc: [
    'self',
    govukInlineScriptHash,
    ...(allowAnalytics ? analyticsScriptSrc : [])
  ],
  imgSrc: ['self', 'data:', ...(allowAnalytics ? analyticsImgSrc : [])],
  frameSrc: ['self', 'data:'],
  objectSrc: ['none'],
  frameAncestors: ['none'],
  formAction: cspFormAction({ isProduction }),
  manifestSrc: ['self'],
  generateNonces: false
})

/**
 * Manage content security policies.
 * @satisfies {ServerRegisterPluginObject<BlankieOptions>}
 */
const contentSecurityPolicy = {
  plugin: Blankie,
  options: cspOptions({
    allowAnalytics: isAnalyticsEnabled(),
    isProduction: config.get('isProduction')
  })
}

export { contentSecurityPolicy }
