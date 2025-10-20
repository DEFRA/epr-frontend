import { describe, expect, it } from 'vitest'
import { getLogFormatType, getLogRedactType } from './log.js'

describe(getLogFormatType, () => {
  it.each([
    ['ecs', { isProduction: true }],
    ['pino-pretty', { isProduction: false }]
  ])('should return %s', (value, config) => {
    expect(getLogFormatType(config)).toBe(value)
  })
})

describe(getLogRedactType, () => {
  it.each([
    [
      ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
      { isProduction: true }
    ],
    [[], { isProduction: false }]
  ])('should return %s', (value, config) => {
    expect(getLogRedactType(config)).toStrictEqual(value)
  })
})
