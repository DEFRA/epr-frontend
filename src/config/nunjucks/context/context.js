import { config } from '#config/config.js'
import { buildNavigation } from '#config/nunjucks/context/build-navigation.js'
import { analyticsConsent } from '#server/common/analytics/consent.js'
import { analyticsPagePath } from '#server/common/analytics/page-path.js'
import { analyticsPageReferrer } from '#server/common/analytics/page-referrer.js'
import { satisfactionSurveyLinks } from '#server/common/satisfaction-survey/links.js'
import { isRegulator } from '#server/auth/roles.js'
import { hasWriteScope } from '#server/auth/scopes.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { paths } from '#server/paths.js'
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
 * @param {HapiRequest | null} request
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
 * What the header calls the service, and where its link goes. A regulator
 * reads the records an operator records, so the operator's name for the
 * service is wrong on a regulator's page, and the operator's start page is not
 * where a regulator starts.
 * @param {HapiRequest | null} request
 * @returns {{ serviceNameKey: string, serviceUrl: string }}
 */
const buildService = (request) => {
  if (isRegulator(request?.auth?.credentials)) {
    return {
      serviceNameKey: 'regulators:serviceName',
      serviceUrl: paths.regulators.home
    }
  }

  return { serviceNameKey: 'common:serviceName', serviceUrl: paths.start }
}

/**
 * @param {HapiRequest | null} request
 */
export function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error({
        message: `Webpack ${path.basename(manifestPath)} not found`,
        err: error
      })
    }
  }

  const i18n = getI18nContext(request)
  const { serviceNameKey, serviceUrl } = buildService(request)

  return {
    analytics: {
      ...analyticsConsent(request),
      measurementId: config.get('analytics.measurementId'),
      pagePath: analyticsPagePath(request),
      pageReferrer: analyticsPageReferrer(request)
    },
    assetPath: `${assetPath}/assets`,
    breadcrumbs: [],
    hasWriteScope: hasWriteScope(request?.auth?.credentials),
    navigation: buildNavigation(request),
    satisfactionSurvey: satisfactionSurveyLinks(i18n.localise),
    serviceName: i18n.localise(serviceNameKey),
    serviceUrl,
    ...i18n,

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
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
