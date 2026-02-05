import { config } from '#config/config.js'
import { nunjucksConfig } from '#config/nunjucks/nunjucks.js'
import { getOidcConfiguration } from '#server/auth/helpers/get-oidc-configuration.js'
import { createSessionCookie } from '#server/auth/helpers/session-cookie.js'
import { getVerifyToken } from '#server/auth/helpers/verify-token.js'
import { createDefraId } from '#server/auth/plugins/defra-id.js'
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
import wasteOrganisationsFixture from '#server/common/helpers/waste-organisations/fixtures/in-memory.json' with { type: 'json' }
import { createWasteOrganisationsPlugin } from '#server/common/helpers/waste-organisations/waste-organisations.plugin.js'
import Crumb from '@hapi/crumb'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'
import path from 'path'
import { initI18n } from './common/helpers/i18n/i18n.js'
import { i18nPlugin } from './common/helpers/i18next.js'
import { router } from './router.js'

/**
 * @param {CreateServerOptions} [options]
 */
export async function createServer(options = {}) {
  setupProxy()

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
    auth: { mode: 'required' }
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
    createWasteOrganisationsPlugin({
      initialOrganisations:
        options.wasteOrganisations ?? wasteOrganisationsFixture.organisations
    }),
    {
      plugin: i18nPlugin,
      options: {
        i18next,
        ignoreRoutes: ['/.well-known', '/favicon.ico', '/health', '/public']
      }
    }
  ]

  const verifyToken = await getVerifyToken(
    await getOidcConfiguration(config.get('defraId.oidcConfigurationUrl'))
  )

  plugins.push(createDefraId(verifyToken), createSessionCookie(verifyToken))

  plugins.push(nunjucksConfig)

  // CSRF protection
  plugins.push({
    plugin: Crumb,
    options: {
      cookieOptions: {
        isSecure: config.get('isProduction'),
        isHttpOnly: true,
        isSameSite: 'Strict'
      },
      skip: (request) => {
        const path = request.path
        return (
          path.startsWith('/health') ||
          path.startsWith('/public') ||
          path.startsWith('/.well-known') ||
          path === '/favicon.ico'
        )
      }
    }
  })

  plugins.push(router)

  await server.register(plugins)

  server.ext('onPreResponse', catchAll)

  return server
}

/**
 * @import {Engine} from '#server/common/helpers/session-cache/cache-engine.js'
 * @import {WasteOrganisation} from '#server/common/helpers/waste-organisations/types.js'
 */

/**
 * @typedef {object} CreateServerOptions
 * @property {WasteOrganisation[]} [wasteOrganisations]
 */
