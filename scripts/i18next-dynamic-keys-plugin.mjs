import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(currentDir, '..')

/**
 * @param {object} obj - Object to traverse
 * @param {string} path - Dot-notation path
 * @returns {object|string|undefined} Value at path or undefined
 */
function getNestedValue(obj, path) {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * @returns {import('i18next-cli').Plugin} Plugin instance
 */
export default function dynamicKeysPlugin() {
  const jsonCache = new Map()

  return {
    name: 'dynamic-keys-plugin',
    version: '1.0.0',

    extractKeysFromExpression: (expression, _config, logger) => {
      const keys = []

      if (expression.type !== 'TemplateLiteral') {
        return keys
      }

      const quasis = expression.quasis?.map((q) => q.cooked ?? q.raw ?? '')
      if (!quasis || quasis.length !== 2 || !quasis[0].includes(':')) {
        return keys
      }

      const [namespace, keyPath] = quasis[0].split(':', 2)
      const parentKey = keyPath?.replace(/\.$/, '')
      if (!namespace || !parentKey) {
        return keys
      }

      let enJson = jsonCache.get(namespace)
      if (!enJson) {
        const enJsonPath = join(
          projectRoot,
          'src',
          'server',
          namespace,
          'en.json'
        )
        enJson = JSON.parse(readFileSync(enJsonPath, 'utf-8'))
        jsonCache.set(namespace, enJson)
      }

      const parentObj = getNestedValue(enJson, parentKey)
      if (!parentObj || typeof parentObj !== 'object') {
        return keys
      }

      for (const childKey of Object.keys(parentObj)) {
        keys.push(`${namespace}:${parentKey}.${childKey}`)
      }

      if (keys.length > 0) {
        logger.info(
          `  Expanded ${keys.length} dynamic keys from ${quasis[0]}\${...}`
        )
      }

      return keys
    }
  }
}
