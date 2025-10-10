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
import Joi from 'joi'
import HapiI18n from 'hapi-i18n'

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

  server.validator(Joi)

  await server.register([
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    sessionCache,
    nunjucksConfig,
    {
      plugin: HapiI18n,
      options: {
        locales: ['en', 'cy'],
        directory: path.resolve('src/locales'),
        defaultLocale: 'en',
        queryParameter: 'lang',
        cookieName: 'lang',
        updateFiles: false,
        objectNotation: true
      }
    },
    router // Register all the controllers/routes defined in src/server/router.js
  ])

  server.ext('onPreAuth', (request, h) => {
    const { languageCode } = request.params

    if (languageCode && ['en', 'cy'].includes(languageCode)) {
      request.i18n.setLocale(languageCode)
      request.localize = request.i18n.__.bind(request.i18n)
    }

    return h.continue
  })

  server.ext('onPreHandler', (request, h) => {
    if (request.i18n) {
      request.localize = request.i18n.__.bind(request.i18n)
    }
    return h.continue
  })

  server.ext('onRequest', (request, h) => {
    const pathLocale = request.path.split('/')[1]
    const supported = ['en', 'cy']

    if (supported.includes(pathLocale)) {
      request.i18n?.setLocale(pathLocale)
      request.localize = request.i18n.__.bind(request.i18n)
    }

    return h.continue
  })

  server.ext('onPreResponse', (request, h) => {
    const response = request.response
    if (response.variety === 'view') {
      response.source.context = {
        ...(response.source.context || {}),
        i18n: request.i18n,
        localize: (...args) => request.i18n.__.apply(request.i18n, args)
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
