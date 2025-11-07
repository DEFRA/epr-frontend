import { languages } from '#server/common/constants/languages.js'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import middleware from 'i18next-http-middleware'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Find namespaces and build a map of namespace → directory path
 * @param {string[]} translationDirs - Base directories to scan
 * @returns {{ namespaces: string[], pathMap: Map<string, string> }}
 */
function findNamespacesWithPaths(translationDirs) {
  const pathMap = new Map()

  for (const baseDir of translationDirs) {
    const resolvedBaseDir = path.resolve(baseDir)
    const entries = fs
      .readdirSync(resolvedBaseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())

    for (const entry of entries) {
      const dirPath = path.join(resolvedBaseDir, entry.name)
      const files = fs.readdirSync(dirPath)

      if (files.some((file) => /(en|cy)\.json$/.test(file))) {
        const ns = entry.name
        // Store first occurrence (routes takes precedence over server)
        if (!pathMap.has(ns)) {
          pathMap.set(ns, baseDir)
        }
      }
    }
  }

  return {
    namespaces: Array.from(pathMap.keys()),
    pathMap
  }
}

export async function initI18n() {
  const translationDirs = ['src/routes', 'src/server']
  const { namespaces: ns, pathMap } = findNamespacesWithPaths(translationDirs)

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
        loadPath: (lng, namespace) => {
          const dir = pathMap.get(namespace)
          if (!dir) {
            throw new Error(
              `Translation namespace "${namespace}" not found. Available namespaces: ${Array.from(pathMap.keys()).join(', ')}`
            )
          }
          return path.resolve(`${dir}/${namespace}/${lng}.json`)
        }
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
