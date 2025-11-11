import fs from 'fs'
import path from 'path'
import { getNamespaces } from './utils/get-namespaces.js'

const INPUT_PATH = 'scripts/input/translations-import.json'

function unflattenKeys(flatObj) {
  const result = {}
  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split('.')
    let current = result
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = value
      } else {
        current[part] = current[part] || {}
        current = current[part]
      }
    })
  }
  return result
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      target[key] = deepMerge(target[key] || {}, source[key])
    } else {
      target[key] = source[key]
    }
  }
  return target
}

const translations = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'))

const grouped = translations.reduce((acc, item) => {
  if (!item.cy) return acc
  acc[item.namespace] = acc[item.namespace] || {}
  acc[item.namespace][item.key] = item.cy
  return acc
}, {})

for (const [namespace, keys] of Object.entries(grouped)) {
  const nsFolder = getNamespaces().find((n) => n.namespace === namespace)
  if (!nsFolder) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️ Namespace "${namespace}" not found, skipping.`)
    continue
  }

  const cyPath = path.join(nsFolder.path, 'cy.json')
  const existing = fs.existsSync(cyPath)
    ? JSON.parse(fs.readFileSync(cyPath, 'utf8'))
    : {}

  const merged = deepMerge(existing, unflattenKeys(keys))

  const sorted = Object.keys(merged)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, k) => ((acc[k] = merged[k]), acc), {})

  fs.writeFileSync(cyPath, JSON.stringify(sorted, null, 2))
  // eslint-disable-next-line no-console
  console.log(`Updated ${cyPath}`)
}

// eslint-disable-next-line no-console
console.log('🎉 Import complete!')
