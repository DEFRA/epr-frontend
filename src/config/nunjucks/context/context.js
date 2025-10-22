import { readFileSync } from 'node:fs'
import path from 'node:path'

import { config } from '#config/config.js'
import { buildNavigation } from '#config/nunjucks/context/build-navigation.js'
import { getUserSession } from '~/src/server/common/helpers/auth/get-user-session.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

/** @type {Record<string, string> | undefined} */
let webpackManifest

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

  const authedUser = request ? await getUserSession(request) : null

  return {
    assetPath: `${assetPath}/assets`,
    authedUser,
    breadcrumbs: [],
    isDefraIdEnabled: config.get('featureFlags.defraId'),
    navigation: buildNavigation(request),
    serviceName: config.get('serviceName'),
    serviceUrl: '/',

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
