import Blankie from 'blankie'
import { config } from '#config/config.js'
import { isAnalyticsEnabled } from '#server/common/analytics/enabled.js'
import {
  analyticsOrigins,
  previewOrigins
} from '#server/common/analytics/origins.js'

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

export function cspFormAction({ isProduction }) {
  return isProduction ? ['self'] : ['self', 'localhost:*']
}

/**
 * Neither frameSrc nor generateNonces ever widen for analytics. The frame source
 * would only serve the container's noscript iframe, which runs without any of
 * the page's controls on the container. A nonce would be passed on by the
 * container to every script it injects, and vouch for all of them. Preview only
 * widens anything when analytics itself is on.
 * @param {{ allowAnalytics: boolean, allowPreview: boolean, isProduction: boolean }} options
 * @returns {BlankieOptions}
 */
export const cspOptions = ({ allowAnalytics, allowPreview, isProduction }) => {
  /**
   * @param {keyof typeof analyticsOrigins} directive
   */
  const granted = (directive) => [
    ...(allowAnalytics ? analyticsOrigins[directive] : []),
    ...(allowAnalytics && allowPreview ? previewOrigins[directive] : [])
  ]

  return {
    defaultSrc: ['self'],
    fontSrc: ['self', 'data:', ...granted('font')],
    connectSrc: ['self', 'wss', 'data:', ...granted('connect')],
    mediaSrc: ['self'],
    styleSrc: ['self', ...granted('style')],
    scriptSrc: ['self', govukInlineScriptHash, ...granted('script')],
    imgSrc: ['self', 'data:', ...granted('img')],
    frameSrc: ['self', 'data:'],
    objectSrc: ['none'],
    frameAncestors: ['none'],
    formAction: cspFormAction({ isProduction }),
    manifestSrc: ['self'],
    generateNonces: false
  }
}

/**
 * Manage content security policies.
 * @satisfies {ServerRegisterPluginObject<BlankieOptions>}
 */
const contentSecurityPolicy = {
  plugin: Blankie,
  options: cspOptions({
    allowAnalytics: isAnalyticsEnabled(),
    allowPreview: config.get('analytics.previewEnabled'),
    isProduction: config.get('isProduction')
  })
}

export { contentSecurityPolicy }
