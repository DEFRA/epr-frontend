import fs from 'node:fs'
import path from 'node:path'

/**
 * Find all namespace directories in src/server that contain translation files
 */
export function findNamespaces(baseDir) {
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      namespace: entry.name,
      path: path.join(baseDir, entry.name)
    }))
}

/**
 * Flatten nested JSON objects into dot-notation keys
 * Example: { a: { b: 'value' } } becomes { 'a.b': 'value' }
 */
export function flattenKeys(obj, prefix = '') {
  let result = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result = { ...result, ...flattenKeys(value, fullKey) }
    } else {
      result[fullKey] = value
    }
  }
  return result
}

/**
 * Unflatten dot-notation keys back to nested objects
 * Example: { 'a.b': 'value' } becomes { a: { b: 'value' } }
 */
export function unflattenKeys(obj) {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const keys = key.split('.')
    let current = result

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!current[k]) {
        current[k] = {}
      }
      current = current[k]
    }

    current[keys[keys.length - 1]] = value
  }
  return result
}

/**
 * Read translation files for a namespace
 * Returns both en.json and cy.json content
 */
export function readTranslationFiles(nsPath) {
  const enPath = path.join(nsPath, 'en.json')
  const cyPath = path.join(nsPath, 'cy.json')

  const enExists = fs.existsSync(enPath)
  const cyExists = fs.existsSync(cyPath)

  const enData = enExists ? JSON.parse(fs.readFileSync(enPath, 'utf8')) : {}
  const cyData = cyExists ? JSON.parse(fs.readFileSync(cyPath, 'utf8')) : {}

  return {
    en: enData,
    cy: cyData,
    enExists,
    cyExists
  }
}
