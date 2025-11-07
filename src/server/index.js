import { config, isDefraIdEnabled } from '#config/config.js'
import { nunjucksConfig } from '#config/nunjucks/nunjucks.js'
import { defraId } from '#modules/identity/auth/defra-id.js'
import { sessionCookie } from '#modules/identity/auth/session-cookie.js'
import { catchAll } from '#shared/errors/errors.js'
import { requestLogger } from '#server/common/helpers/logging/request-logger.js'
import { getCacheEngine } from '#modules/platform/session/cache-engine.js'
import { sessionCache } from '#modules/platform/session/session-cache.js'
import { contentSecurityPolicy } from '#shared/middleware/content-security-policy.js'
import { requestTracing } from '#shared/middleware/request-tracing.js'
import { userAgentProtection } from '#shared/middleware/useragent-protection.js'
import { setupProxy } from '#shared/security/proxy/setup-proxy.js'
import { secureContext } from '#shared/security/secure-context/index.js'
import { pulse } from '#shared/server/pulse.js'
import { initI18n } from '#modules/localisation/i18n.js'
import { i18nPlugin } from '#modules/localisation/plugins/i18next.js'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'
import path from 'path'
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
 * @import {Engine} from '#modules/platform/session/cache-engine.js'
 */
