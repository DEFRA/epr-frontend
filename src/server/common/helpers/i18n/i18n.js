import { languages } from '#server/common/constants/languages.js'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import middleware from 'i18next-http-middleware'
import path from 'path'

import {
  findNamespaces as findAllNamespaces,
  readTranslationFiles
} from '#utils/translation/translation-utils.js'

/**
 * Find namespaces that have translation files (en.json or cy.json)
 */
function findNamespaces(baseDir) {
  const allNamespaces = findAllNamespaces(baseDir)

  return allNamespaces
    .filter(({ path: nsPath }) => {
      const { enExists, cyExists } = readTranslationFiles(nsPath)
      return enExists || cyExists
    })
    .map(({ namespace }) => namespace)
}

export async function initI18n() {
  const serverDir = path.resolve('src/server')
  const ns = findNamespaces(serverDir)

  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      lng: languages.ENGLISH,
      fallbackLng: languages.ENGLISH,
      preload: [languages.ENGLISH, languages.WELSH],
      supportedLngs: [languages.ENGLISH, languages.WELSH],
      ns,
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
