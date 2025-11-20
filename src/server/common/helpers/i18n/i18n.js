import { languages } from '#server/common/constants/languages.js'
import fs from 'fs'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import middleware from 'i18next-http-middleware'
import path from 'path'

/**
 * Recursively find namespaces by looking for en.json or cy.json files
 */
function findNamespaces(baseDir) {
  const namespaces = new Set()

  const entries = fs.readdirSync(baseDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirPath = path.join(baseDir, entry.name)
      const files = fs.readdirSync(dirPath)

      if (files.some((file) => /(en|cy)\.json$/.test(file))) {
        const ns = entry.name
        namespaces.add(ns)
      }
    }
  }

  return Array.from(namespaces)
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
