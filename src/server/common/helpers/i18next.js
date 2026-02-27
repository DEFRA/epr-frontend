import middleware from 'i18next-http-middleware'
import { languages, pathPrefix } from '../constants/languages.js'
import { localiseUrl } from './i18n/localiseUrl.js'

/**
 * Creates a URL localizer function for the given language
 * @param {string | undefined} locale - The (language code or) locale (e.g., 'en', 'cy', 'en-GB')
 * @returns {(path: string) => string} A function to localize URLs
 */
export const getLocaliseUrl = (locale) => {
  const [lang] = locale.split('-')
  return localiseUrl(lang)
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

        if (path === pathPrefix.cy || path.startsWith(`${pathPrefix.cy}/`)) {
          await request.i18n.changeLanguage(languages.WELSH)
          request.setUrl(path.slice(pathPrefix.cy.length) || '/')
        } else {
          await request.i18n.changeLanguage(languages.ENGLISH)
        }

        // Add localiseUrl helper
        request.localiseUrl = getLocaliseUrl(request.i18n.language)
      }

      return h.continue
    })
  }
}
