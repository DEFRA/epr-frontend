/*
* Hapi plugin for i18n: loads locale files and injects `t()` + `lang` into view context.
* Reloads locales on each request in development mode.
*/

import { loadLocales, languageSelector } from '~/src/server/common/helpers/i18n.js'

export const i18nPlugin = {
  name: 'i18n',
  register: async (server) => {
    loadLocales()
    server.ext('onPreResponse', (request, h) => {
      const { lang = 'en' } = request.params || {}
      const context = request.response?.source?.context

      if (context) {
        context.t = (key, vars) => languageSelector(lang, key, vars)
        context.lang = lang
      }

      return h.continue
    })

    // This is so that we don't have to restart the server on every change to json locale files
    if (process.env.NODE_ENV === 'development') {
      server.ext('onRequest', (req, h) => {
        loadLocales()
        return h.continue
      })
    }
  }
}
