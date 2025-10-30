import middleware from 'i18next-http-middleware'
import { languages } from '../constants/language-codes.js'
import { localiseUrl } from './i18n/localiseUrl.js'
import { langPrefix } from '../constants/lang-prefix.js'

export const i18nPlugin = {
  name: 'app-i18n',
  version: '1.0.0',
  register: async function (server, options) {
    const { i18next } = options

    server.ext('onRequest', async (request, h) => {
      middleware.handle(i18next)(request.raw.req, request.raw.res, () => {})
      request.i18n = request.raw.req.i18n
      request.t = request.i18n.t.bind(request.i18n)

      const { path } = request
      if (path.startsWith(langPrefix.cy)) {
        await request.i18n.changeLanguage(languages.WELSH)
        request.setUrl(path.replace(/^\/cy/, '') || '/')
      } else {
        await request.i18n.changeLanguage(languages.ENGLISH)
      }

      return h.continue
    })

    server.ext('onPreResponse', (request, h) => {
      const language = request.i18n?.language
      const pathPrefix = langPrefix[language]

      if (request.response?.source?.context) {
        const context = request.response.source.context
        context.t = request.t
        context.language = language
        context.htmlLang = language

        if (request.response.variety === 'view') {
          request.response.source.context = {
            ...context,
            localise: request.t,
            localiseUrl: (path) => localiseUrl(path, pathPrefix)
          }
        }
      }

      return h.continue
    })
  }
}
