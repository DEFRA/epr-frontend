import { describe, expect, it } from 'vitest'
import { getLogFormatType } from './log.js'

describe(getLogFormatType, () => {
  it.each([
    ['ecs', { isProduction: true }],
    ['pino-pretty', { isProduction: false }]
  ])('should return %s', (value, config) => {
    expect(getLogFormatType(config)).toBe(value)
  })
})
