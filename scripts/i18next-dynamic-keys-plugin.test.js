import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import dynamicKeysPlugin from './i18next-dynamic-keys-plugin.mjs'

vi.mock(import('node:fs'), () => ({
  readFileSync: vi.fn()
}))

describe('i18next-dynamic-keys-plugin', () => {
  let plugin
  let mockLogger

  beforeEach(() => {
    plugin = dynamicKeysPlugin()
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
    vi.clearAllMocks()
  })

  describe('extractKeysFromExpression', () => {
    it('should return empty array for non-template-literal expressions', () => {
      const expression = {
        type: 'StringLiteral',
        value: 'static-key'
      }

      const keys = plugin.extractKeysFromExpression(expression, {}, mockLogger)

      expect(keys).toStrictEqual([])
    })

    it('should handle template literals with undefined cooked and raw values', () => {
      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          { cooked: undefined, raw: undefined },
          { cooked: '', raw: '' }
        ],
        expressions: [{ type: 'Identifier', value: 'code' }]
      }

      const keys = plugin.extractKeysFromExpression(expression, {}, mockLogger)

      expect(keys).toStrictEqual([])
    })

    it('should extract keys from simple suffix pattern', () => {
      // Mock en.json content
      readFileSync.mockReturnValue(
        JSON.stringify({
          failure: {
            CODE_A: 'Error A',
            CODE_B: 'Error B',
            CODE_C: 'Error C'
          }
        })
      )

      // Template literal: `summary-log:failure.${code}`
      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          { cooked: 'summary-log:failure.', raw: 'summary-log:failure.' },
          { cooked: '', raw: '' }
        ],
        expressions: [{ type: 'Identifier', value: 'code' }]
      }

      const keys = plugin.extractKeysFromExpression(expression, {}, mockLogger)

      expect(keys).toStrictEqual([
        'summary-log:failure.CODE_A',
        'summary-log:failure.CODE_B',
        'summary-log:failure.CODE_C'
      ])

      expect(mockLogger.info).toHaveBeenCalledWith(
        '  Expanded 3 dynamic keys from summary-log:failure.${...}'
      )
    })

    it('should handle nested parent keys', () => {
      // Mock en.json with nested structure
      readFileSync.mockReturnValue(
        JSON.stringify({
          errors: {
            validation: {
              REQUIRED: 'Field is required',
              INVALID: 'Field is invalid'
            }
          }
        })
      )

      // Template literal: `common:errors.validation.${type}`
      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          {
            cooked: 'common:errors.validation.',
            raw: 'common:errors.validation.'
          },
          { cooked: '', raw: '' }
        ],
        expressions: [{ type: 'Identifier', value: 'type' }]
      }

      const keys = plugin.extractKeysFromExpression(expression, {}, mockLogger)

      expect(keys).toStrictEqual([
        'common:errors.validation.REQUIRED',
        'common:errors.validation.INVALID'
      ])
    })

    it('should cache JSON files to avoid repeated reads', () => {
      readFileSync.mockReturnValue(
        JSON.stringify({
          failure: {
            CODE_A: 'Error A'
          }
        })
      )

      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          { cooked: 'summary-log:failure.', raw: 'summary-log:failure.' },
          { cooked: '', raw: '' }
        ],
        expressions: [{ type: 'Identifier', value: 'code' }]
      }

      // Call twice with same namespace
      plugin.extractKeysFromExpression(expression, {}, mockLogger)
      plugin.extractKeysFromExpression(expression, {}, mockLogger)

      // Should only read file once (cached on second call)
      expect(readFileSync).toHaveBeenCalledTimes(1)
    })

    it('should throw error for missing en.json', () => {
      readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          {
            cooked: 'nonexistent:failure.',
            raw: 'nonexistent:failure.'
          },
          { cooked: '', raw: '' }
        ],
        expressions: [{ type: 'Identifier', value: 'code' }]
      }

      expect(() => {
        plugin.extractKeysFromExpression(expression, {}, mockLogger)
      }).toThrowError(/ENOENT/)
    })

    it('should throw error for malformed JSON', () => {
      readFileSync.mockReturnValue('{ invalid json }')

      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          { cooked: 'namespace:failure.', raw: 'namespace:failure.' },
          { cooked: '', raw: '' }
        ],
        expressions: [{ type: 'Identifier', value: 'code' }]
      }

      expect(() => {
        plugin.extractKeysFromExpression(expression, {}, mockLogger)
      }).toThrowError()
    })

    it('should handle missing parent object gracefully', () => {
      readFileSync.mockReturnValue(
        JSON.stringify({
          someOtherKey: 'value'
        })
      )

      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          {
            cooked: 'namespace:nonexistent.',
            raw: 'namespace:nonexistent.'
          },
          { cooked: '', raw: '' }
        ],
        expressions: [{ type: 'Identifier', value: 'code' }]
      }

      const keys = plugin.extractKeysFromExpression(expression, {}, mockLogger)

      expect(keys).toStrictEqual([])
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })

    it('should handle empty parent object', () => {
      readFileSync.mockReturnValue(
        JSON.stringify({
          failure: {}
        })
      )

      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          { cooked: 'namespace:failure.', raw: 'namespace:failure.' },
          { cooked: '', raw: '' }
        ],
        expressions: [{ type: 'Identifier', value: 'code' }]
      }

      const keys = plugin.extractKeysFromExpression(expression, {}, mockLogger)

      expect(keys).toStrictEqual([])
      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should ignore non-suffix patterns (for future extension)', () => {
      // Pattern with prefix variable: `namespace:${prefix}.child`
      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          { cooked: 'namespace:', raw: 'namespace:' },
          { cooked: '.child', raw: '.child' }
        ],
        expressions: [{ type: 'Identifier', value: 'prefix' }]
      }

      const keys = plugin.extractKeysFromExpression(expression, {}, mockLogger)

      // Currently not supported, should return empty
      expect(keys).toStrictEqual([])
    })

    it('should ignore template literals without namespace separator', () => {
      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          { cooked: 'justAKey.', raw: 'justAKey.' },
          { cooked: '', raw: '' }
        ],
        expressions: [{ type: 'Identifier', value: 'var' }]
      }

      const keys = plugin.extractKeysFromExpression(expression, {}, mockLogger)

      expect(keys).toStrictEqual([])
    })

    it('should handle template literals with multiple expressions', () => {
      // Pattern: `namespace:${a}.${b}`  (not currently supported)
      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          { cooked: 'namespace:', raw: 'namespace:' },
          { cooked: '.', raw: '.' },
          { cooked: '', raw: '' }
        ],
        expressions: [
          { type: 'Identifier', value: 'a' },
          { type: 'Identifier', value: 'b' }
        ]
      }

      const keys = plugin.extractKeysFromExpression(expression, {}, mockLogger)

      // Not supported yet, should return empty
      expect(keys).toStrictEqual([])
    })

    it('should work with real-world summary-log example', () => {
      // Simulate actual summary-log/en.json structure
      readFileSync.mockReturnValue(
        JSON.stringify({
          pageTitle: 'Summary Log',
          failure: {
            ACCREDITATION_MISMATCH: 'Accreditation number is incorrect',
            FILE_TOO_LARGE: 'File size must be a maximum of {{maxSize}}MB',
            UNKNOWN: 'An unexpected validation error occurred'
          }
        })
      )

      const expression = {
        type: 'TemplateLiteral',
        quasis: [
          { cooked: 'summary-log:failure.', raw: 'summary-log:failure.' },
          { cooked: '', raw: '' }
        ],
        expressions: [{ type: 'Identifier', value: 'code' }]
      }

      const keys = plugin.extractKeysFromExpression(expression, {}, mockLogger)

      expect(keys).toHaveLength(3)
      expect(keys).toContain('summary-log:failure.ACCREDITATION_MISMATCH')
      expect(keys).toContain('summary-log:failure.FILE_TOO_LARGE')
      expect(keys).toContain('summary-log:failure.UNKNOWN')
    })
  })
})
