import {
  findNamespaces,
  readTranslationFiles
} from '../src/utils/translation/translation-utils.js'

const baseDir = 'src/server'

const namespaces = findNamespaces(baseDir)

const missing = []

for (const { namespace, path: nsPath } of namespaces) {
  const { enExists, cyExists } = readTranslationFiles(nsPath)

  if (!enExists && !cyExists) {
    continue
  }
  if (!enExists || !cyExists) {
    missing.push({ namespace, en: enExists, cy: cyExists })
  }
}

if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error('🚨 Missing locale files:', missing)
  process.exitCode = 1
} else {
  // eslint-disable-next-line no-console
  console.log('✅ All namespaces have both en.json and cy.json')
}
