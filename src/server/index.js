import { config, isDefraIdEnabled } from '#config/config.js'
import { nunjucksConfig } from '#config/nunjucks/nunjucks.js'
import { sessionCookie } from '#server/auth/helpers/session-cookie.js'
import { defraId } from '#server/auth/plugins/defra-id.js'
import { contentSecurityPolicy } from '#server/common/helpers/content-security-policy.js'
import { catchAll } from '#server/common/helpers/errors.js'
import { requestLogger } from '#server/common/helpers/logging/request-logger.js'
import { setupProxy } from '#server/common/helpers/proxy/setup-proxy.js'
import { pulse } from '#server/common/helpers/pulse.js'
import { requestTracing } from '#server/common/helpers/request-tracing.js'
import { secureContext } from '#server/common/helpers/secure-context/index.js'
import { getCacheEngine } from '#server/common/helpers/session-cache/cache-engine.js'
import { sessionCache } from '#server/common/helpers/session-cache/session-cache.js'
import { userAgentProtection } from '#server/common/helpers/useragent-protection.js'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'
import path from 'path'
import { initI18n } from './common/helpers/i18n/i18n.js'
import { i18nPlugin } from './common/helpers/i18next.js'
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

  const i18next = await initI18n()

  const plugins = [
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    sessionCache,
    userAgentProtection, // Must be registered before Scooter to intercept malicious User-Agents
    Scooter,
    contentSecurityPolicy,
    {
      plugin: i18nPlugin,
      options: {
        i18next,
        ignoreRoutes: ['/.well-known', '/favicon.ico', '/health', '/public']
      }
    }
  ]

  if (defraIdEnabled) {
    plugins.push(defraId, sessionCookie)
  }

  plugins.push(nunjucksConfig, router)

  await server.register(plugins)

  server.ext('onPreResponse', catchAll)

  return server
}

/**
 * @import {Engine} from '#server/common/helpers/session-cache/cache-engine.js'
 */
