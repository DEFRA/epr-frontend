import fs from 'fs'
import path from 'path'
import { getNamespaces } from './utils/get-namespaces.js'

const OUTPUT_PATH = 'scripts/output/translations-export.json'

function flattenKeys(obj, prefix = '') {
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

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })

const missingRows = []

for (const { namespace, path: nsPath } of getNamespaces()) {
  const enPath = path.join(nsPath, 'en.json')
  const cyPath = path.join(nsPath, 'cy.json')

  const enData = fs.existsSync(enPath)
    ? flattenKeys(JSON.parse(fs.readFileSync(enPath, 'utf8')))
    : {}
  const cyData = fs.existsSync(cyPath)
    ? flattenKeys(JSON.parse(fs.readFileSync(cyPath, 'utf8')))
    : {}

  const allKeys = Array.from(
    new Set([...Object.keys(enData), ...Object.keys(cyData)])
  )

  for (const key of allKeys) {
    const enValue = enData[key] || ''
    const cyValue = cyData[key] || ''

    if (!enValue || !cyValue) {
      missingRows.push({
        namespace,
        key,
        en: enValue,
        cy: cyValue,
        missingInCy: !cyValue && !!enValue,
        missingInEn: !enValue && !!cyValue
      })
    }
  }
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(missingRows, null, 2))

// eslint-disable-next-line no-console
console.log(
  `✅ Exported ${missingRows.length} missing translations to ${OUTPUT_PATH}`
)
