import { languages } from '#server/common/constants/language-codes.js'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import middleware from 'i18next-http-middleware'
import path from 'path'

export async function initI18n() {
  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      lng: languages.ENGLISH,
      fallbackLng: languages.ENGLISH,
      preload: [languages.ENGLISH, languages.WELSH],
      // FIXME can we do something simpler than having to hardcode these?
      ns: ['account', 'common', 'error', 'home'],
      defaultNS: 'common',
      backend: {
        loadPath: path.resolve('src/server/{{ns}}/{{lng}}.json')
      },
      detection: {
        order: ['path', 'querystring', 'cookie', 'header'],
        lookupQuerystring: 'lang',
        lookupCookie: 'i18next',
        caches: false
      },
      debug: false
    })

  return i18next
}
