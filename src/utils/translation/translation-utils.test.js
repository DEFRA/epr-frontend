import fs from 'node:fs'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  findNamespaces,
  flattenKeys,
  unflattenKeys,
  readTranslationFiles
} from './translation-utils.js'

vi.mock(import('node:fs'))

describe('translation-utils', () => {
  describe(findNamespaces, () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('should find all directory entries', () => {
      const mockEntries = [
        { name: 'home', isDirectory: () => true, isFile: () => false },
        { name: 'account', isDirectory: () => true, isFile: () => false },
        { name: 'en.json', isDirectory: () => false, isFile: () => true }
      ]

      vi.mocked(fs.readdirSync).mockReturnValue(mockEntries)

      const result = findNamespaces('/base/path')

      expect(result).toStrictEqual([
        { namespace: 'home', path: '/base/path/home' },
        { namespace: 'account', path: '/base/path/account' }
      ])
    })

    it('should return empty array when no directories found', () => {
      const mockEntries = [
        { name: 'en.json', isDirectory: () => false, isFile: () => true }
      ]

      vi.mocked(fs.readdirSync).mockReturnValue(mockEntries)

      const result = findNamespaces('/base/path')

      expect(result).toStrictEqual([])
    })
  })

  describe(flattenKeys, () => {
    it('should flatten simple nested object', () => {
      const input = {
        a: {
          b: 'value1',
          c: 'value2'
        }
      }

      const result = flattenKeys(input)

      expect(result).toStrictEqual({
        'a.b': 'value1',
        'a.c': 'value2'
      })
    })

    it('should flatten deeply nested object', () => {
      const input = {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      }

      const result = flattenKeys(input)

      expect(result).toStrictEqual({
        'level1.level2.level3': 'deep value'
      })
    })

    it('should handle flat object', () => {
      const input = {
        key1: 'value1',
        key2: 'value2'
      }

      const result = flattenKeys(input)

      expect(result).toStrictEqual(input)
    })

    it('should handle arrays as values', () => {
      const input = {
        items: ['a', 'b', 'c']
      }

      const result = flattenKeys(input)

      expect(result).toStrictEqual({
        items: ['a', 'b', 'c']
      })
    })

    it('should handle empty object', () => {
      const result = flattenKeys({})

      expect(result).toStrictEqual({})
    })

    it('should handle null values', () => {
      const input = {
        key: null
      }

      const result = flattenKeys(input)

      expect(result).toStrictEqual({
        key: null
      })
    })

    it('should use custom prefix', () => {
      const input = {
        a: 'value'
      }

      const result = flattenKeys(input, 'prefix')

      expect(result).toStrictEqual({
        'prefix.a': 'value'
      })
    })
  })

  describe(unflattenKeys, () => {
    it('should unflatten simple dot-notation keys', () => {
      const input = {
        'a.b': 'value1',
        'a.c': 'value2'
      }

      const result = unflattenKeys(input)

      expect(result).toStrictEqual({
        a: {
          b: 'value1',
          c: 'value2'
        }
      })
    })

    it('should unflatten deeply nested keys', () => {
      const input = {
        'level1.level2.level3': 'deep value'
      }

      const result = unflattenKeys(input)

      expect(result).toStrictEqual({
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      })
    })

    it('should handle flat keys', () => {
      const input = {
        key1: 'value1',
        key2: 'value2'
      }

      const result = unflattenKeys(input)

      expect(result).toStrictEqual(input)
    })

    it('should handle empty object', () => {
      const result = unflattenKeys({})

      expect(result).toStrictEqual({})
    })

    it('should be inverse of flattenKeys', () => {
      const original = {
        services: {
          registration: 'Registration',
          accreditation: 'Accreditation'
        },
        title: 'Home'
      }

      const flattened = flattenKeys(original)
      const unflattened = unflattenKeys(flattened)

      expect(unflattened).toStrictEqual(original)
    })
  })

  describe(readTranslationFiles, () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('should read both en.json and cy.json when they exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.includes('en.json')) {
          return JSON.stringify({ greeting: 'Hello' })
        }
        return JSON.stringify({ greeting: 'Helo' })
      })

      const result = readTranslationFiles('/path/to/namespace')

      expect(result).toStrictEqual({
        en: { greeting: 'Hello' },
        cy: { greeting: 'Helo' },
        enExists: true,
        cyExists: true
      })
    })

    it('should return empty object for missing en.json', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.includes('en.json')) return false
        if (path.includes('cy.json')) return true
        return false
      })
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ greeting: 'Helo' })
      )

      const result = readTranslationFiles('/path/to/namespace')

      expect(result).toStrictEqual({
        en: {},
        cy: { greeting: 'Helo' },
        enExists: false,
        cyExists: true
      })
    })

    it('should return empty object for missing cy.json', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path.includes('en.json')) return true
        if (path.includes('cy.json')) return false
        return false
      })
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ greeting: 'Hello' })
      )

      const result = readTranslationFiles('/path/to/namespace')

      expect(result).toStrictEqual({
        en: { greeting: 'Hello' },
        cy: {},
        enExists: true,
        cyExists: false
      })
    })

    it('should return empty objects when both files are missing', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = readTranslationFiles('/path/to/namespace')

      expect(result).toStrictEqual({
        en: {},
        cy: {},
        enExists: false,
        cyExists: false
      })
    })
  })
})
