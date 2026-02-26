import { config } from '#config/config.js'
import { buildNavigation } from '#config/nunjucks/context/build-navigation.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

/** @type {Record<string, string> | undefined} */
let webpackManifest

/**
 * Extract i18n properties from request for template context
 * Only includes properties if i18n is available on the request
 * @param {Request | null} request
 */
const getI18nContext = (request) => {
  if (!request?.i18n) {
    // Provide passthrough fallbacks so that page.njk layout calls like
    // localise('common:serviceName') don't throw when i18n is unavailable.
    // This happens for routes in the i18n ignoreRoutes list (e.g. /public,
    // /health) — if those requests hit an error, the catchAll handler renders
    // an HTML error page whose layout calls localise() and localiseUrl().
    return {
      localise: (key) => key,
      localiseUrl: (url) => url
    }
  }

  return {
    htmlLang: request.i18n.language,
    language: request.i18n.language,
    localise: request.t,
    localiseUrl: request.localiseUrl
  }
}

/**
 * @param {Request | null} request
 */
export function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(
        { err: error },
        `Webpack ${path.basename(manifestPath)} not found`
      )
    }
  }

  return {
    assetPath: `${assetPath}/assets`,
    breadcrumbs: [],
    navigation: buildNavigation(request),
    serviceUrl: '/start',
    ...getI18nContext(request),

    /**
     * @param {string} asset
     */
    getAssetPath(asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
