import fs from 'fs'
import path from 'path'

const locales = {}

/**
 * Loads all translation files from ./locales
 */
export function loadLocales() {
  const localeDir = path.resolve('./src/locales')
  const files = fs.readdirSync(localeDir)

  for (const file of files) {
    if (file.endsWith('.json')) {
      const code = path.basename(file, '.json')
      locales[code] = JSON.parse(fs.readFileSync(path.join(localeDir, file)))
    }
  }
}

/**
 * Retrieves a translation by key, e.g. "home.heading"
 * Falls back to English if missing
 * Supports {{var}} interpolation
 */
export function languageSelector(lang, key, vars = {}) {
  const keys = key.split('.')
  let value = keys.reduce((obj, k) => (obj ? obj[k] : null), locales[lang])

  if (!value) {
    value = keys.reduce((obj, k) => (obj ? obj[k] : null), locales['en'])
  }

  if (typeof value === 'string') {
    for (const [name, val] of Object.entries(vars)) {
      value = value.replace(new RegExp(`{{\\s*${name}\\s*}}`, 'g'), val)
    }
  }

  return value || key
}
