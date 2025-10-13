import path from 'path'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import middleware from 'i18next-http-middleware'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function initI18n() {
  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      fallbackLng: 'en',
      preload: ['en', 'cy'],
      ns: ['common', 'home', 'errors'],
      defaultNS: 'common',
      backend: {
        loadPath: path.resolve('src/locales/{{lng}}/{{ns}}.json')
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
