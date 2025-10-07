import fs from 'fs'
import path from 'path'

const locales = {}

export function loadLocales() {
  const localeDir = path.resolve('./locales')
  for (const file of fs.readdirSync(localeDir)) {
    if (file.endsWith('.json')) {
      const code = path.basename(file, '.json')
      locales[code] = JSON.parse(fs.readFileSync(path.join(localeDir, file)))
    }
  }
}

export function languageSelector(lang, key) {
  const keys = key.split('.')
  return keys.reduce((obj, k) => (obj ? obj[k] : null), locales[lang] || {})
}
