import middleware from 'i18next-http-middleware'
import { langPrefix } from '../constants/lang-prefix.js'
import { languages } from '../constants/language-codes.js'
import { localiseUrl } from './i18n/localiseUrl.js'

const getLocaliseUrl = (language) => {
  // FIXME can we remove default?
  const normalisedLang = language?.split('-')[0] || 'en'
  return localiseUrl(langPrefix[normalisedLang] ?? '')
}

export const i18nPlugin = {
  name: 'app-i18n',
  version: '1.0.0',
  register: async function (server, opt) {
    const { i18next, ...options } = opt

    const i18nMiddleware = middleware.handle(i18next, {
      ...options
    })

    server.ext('onRequest', async (request, h) => {
      i18nMiddleware(request, request.raw.res, () => {})

      if (request.i18n) {
        const { path } = request

        if (path.startsWith(langPrefix.cy)) {
          await request.i18n.changeLanguage(languages.WELSH)
          request.setUrl(path.replace(/^\/cy/, '') || '/')
        } else {
          await request.i18n.changeLanguage(languages.ENGLISH)
        }

        // Add localiseUrl helper
        request.localiseUrl = getLocaliseUrl(request.i18n.language)
      }

      return h.continue
    })

    server.ext('onPreResponse', (request, h) => {
      if (request.response?.source?.context && request.i18n) {
        // FIXME do we need all of this as we're modding the request / context?
        const context = request.response.source.context
        context.t = request.t
        context.language = request.i18n.language
        context.htmlLang = request.i18n.language

        if (request.response.variety === 'view') {
          request.response.source.context = {
            ...context,
            localise: request.t,
            localiseUrl: getLocaliseUrl(request.i18n.language)
          }
        }
      }

      return h.continue
    })
  }
}
