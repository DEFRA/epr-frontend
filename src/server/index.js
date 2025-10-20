import hapi from '@hapi/hapi'
import path from 'path'

import { config, isDefraIdEnabled } from '~/src/config/config.js'
import { nunjucksConfig } from '~/src/config/nunjucks/nunjucks.js'
import { defraId } from '~/src/server/common/helpers/auth/defra-id.js'
import { sessionCookie } from '~/src/server/common/helpers/auth/session-cookie.js'
import { catchAll } from '~/src/server/common/helpers/errors.js'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { setupProxy } from '~/src/server/common/helpers/proxy/setup-proxy.js'
import { pulse } from '~/src/server/common/helpers/pulse.js'
import { requestTracing } from '~/src/server/common/helpers/request-tracing.js'
import { secureContext } from '~/src/server/common/helpers/secure-context/index.js'
import { getCacheEngine } from '~/src/server/common/helpers/session-cache/cache-engine.js'
import { sessionCache } from '~/src/server/common/helpers/session-cache/session-cache.js'
import { router } from './router.js'

export async function createServer() {
  setupProxy()

  const defraIdEnabled = isDefraIdEnabled()

  const routes = {
    validate: {
      options: {
        abortEarly: false
      }
    },
    files: {
      relativeTo: path.resolve(config.get('root'), '.public')
    },
    security: {
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: false
      },
      xss: 'enabled',
      noSniff: true,
      xframe: true
    },
    auth: defraIdEnabled ? { mode: 'try' } : false
  }

  const server = hapi.server({
    port: config.get('port'),
    routes,
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(
          /** @type {Engine} */ config.get('session.cache.engine')
        )
      }
    ],
    state: {
      strictHeader: false
    }
  })

  server.app.cache = server.cache({
    cache: config.get('session.cache.name'),
    expiresIn: config.get('session.cache.ttl'),
    segment: 'session'
  })

  const plugins = [
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    sessionCache
  ]

  // Only register authentication strategies when Defra ID is enabled
  if (defraIdEnabled) {
    plugins.push(defraId, sessionCookie)
  }

  plugins.push(nunjucksConfig, router)

  await server.register(plugins)

  server.ext('onPreResponse', catchAll)

  return server
}

/**
 * @import {Engine} from '~/src/server/common/helpers/session-cache/cache-engine.js'
 */
