import path from 'path'
import hapi from '@hapi/hapi'

import { config } from '~/src/config/config.js'
import { nunjucksConfig } from '~/src/config/nunjucks/nunjucks.js'
import { router } from './router.js'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { catchAll } from '~/src/server/common/helpers/errors.js'
import { secureContext } from '~/src/server/common/helpers/secure-context/index.js'
import { sessionCache } from '~/src/server/common/helpers/session-cache/session-cache.js'
import { getCacheEngine } from '~/src/server/common/helpers/session-cache/cache-engine.js'
import { pulse } from '~/src/server/common/helpers/pulse.js'
import { requestTracing } from '~/src/server/common/helpers/request-tracing.js'
import { setupProxy } from '~/src/server/common/helpers/proxy/setup-proxy.js'
import { initI18n } from './common/helpers/i18n/i18n.js'
import { i18nPlugin } from './common/helpers/i18next.js'

export async function createServer() {
  setupProxy()
  const server = hapi.server({
    port: config.get('port'),
    routes: {
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
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(
          /** @type {Engine} */ (config.get('session.cache.engine'))
        )
      }
    ],
    state: {
      strictHeader: false
    }
  })
  const i18next = await initI18n()

  await server.register([
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    sessionCache,
    nunjucksConfig,
    { plugin: i18nPlugin, options: { i18next } },
    router // Register all the controllers/routes defined in src/server/router.js
  ])

  server.ext('onRequest', (request, h) => {
    const { path } = request

    if (path.startsWith('/cy')) {
      request.i18n.changeLanguage('cy')
      request.setUrl(path.replace(/^\/cy/, '') || '/')
    } else {
      request.i18n.changeLanguage('en')
    }
    return h.continue
  })

  server.ext('onPreResponse', (request, h) => {
    console.log('serverRequest##################: ', request?.t);
  if (request.response.variety === 'view') {
    request.response.source.context = {
      ...(request.response.source.context || {}),
      localise: request.t
    }
  }
  return h.continue
})

  server.ext('onPreResponse', catchAll)

  return server
}

/**
 * @import {Engine} from '~/src/server/common/helpers/session-cache/cache-engine.js'
 */
