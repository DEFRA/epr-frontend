import { config, isDefraIdEnabled } from '#config/config.js'
import { buildNavigation } from '#config/nunjucks/context/build-navigation.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'
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
    return {}
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
export async function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    }
  }

  const { value: authedUser } = await getUserSession(request)

  return {
    assetPath: `${assetPath}/assets`,
    breadcrumbs: [],
    isDefraIdEnabled: isDefraIdEnabled(),
    navigation: buildNavigation(request, authedUser ?? null),
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
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
