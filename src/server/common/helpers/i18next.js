import middleware from 'i18next-http-middleware'
import { langPrefix } from '../constants/lang-prefix.js'
import { languages } from '../constants/language-codes.js'
import { localiseUrl } from './i18n/localiseUrl.js'

const getLocaliseUrl = (language) => localiseUrl(langPrefix[language])

export const i18nPlugin = {
  name: 'app-i18n',
  version: '1.0.0',
  register: async function (server, options) {
    const { i18next } = options

    server.ext('onRequest', async (request, h) => {
      middleware.handle(i18next)(request.raw.req, request.raw.res, () => {})
      request.i18n = request.raw.req.i18n
      request.t = request.i18n.t.bind(request.i18n)
      request.localiseUrl = getLocaliseUrl(request.i18n.language)

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
      const language = request.i18n.language

      if (request.response?.source?.context) {
        const context = request.response.source.context
        context.t = request.t
        context.language = language
        context.htmlLang = language

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
