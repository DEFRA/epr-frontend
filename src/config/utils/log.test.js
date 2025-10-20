import { describe, expect, it } from 'vitest'
import { getLogFormatType, getLogRedactType } from './log.js'

describe(getLogFormatType, () => {
  it.each([
    ['ecs', true],
    ['pino-pretty', false]
  ])('should return %s', (value, isProduction) => {
    expect(getLogFormatType(isProduction)).toBe(value)
  })
})

describe(getLogRedactType, () => {
  it.each([
    [['req.headers.authorization', 'req.headers.cookie', 'res.headers'], true],
    [[], false]
  ])('should return %s', (value, isProduction) => {
    expect(getLogRedactType(isProduction)).toStrictEqual(value)
  })
})
