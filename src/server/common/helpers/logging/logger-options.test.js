import { describe, test, expect, afterEach } from 'vitest'

import { loggerOptions } from './logger-options.js'
import { config } from '#config/config.js'

describe('loggerOptions.serializers.err', () => {
  const { err: errorSerializer } = loggerOptions.serializers

  test('formats Error instance correctly', () => {
    const error = new Error('Something went wrong')
    const result = errorSerializer(error)

    expect(result).toStrictEqual({
      message: 'Something went wrong',
      stack_trace: expect.stringContaining('Error: Something went wrong'),
      type: 'Error'
    })
  })

  test('returns non-Error values as-is', () => {
    expect(errorSerializer('string error')).toBe('string error')
    expect(errorSerializer(123)).toBe(123)
    expect(errorSerializer(null)).toBeNull()
    expect(errorSerializer(undefined)).toBeUndefined()
    expect(errorSerializer({ message: 'not an error' })).toStrictEqual({
      message: 'not an error'
    })
  })

  test('includes Boom error details in non-prod environment', () => {
    const boomError = new Error('Validation failed')
    boomError.isBoom = true
    boomError.output = {
      statusCode: 422,
      payload: {
        error: 'Unprocessable Entity',
        message: 'Validation failed: field is required'
      }
    }

    const result = errorSerializer(boomError)

    expect(result).toStrictEqual({
      message: 'Validation failed',
      stack_trace: expect.stringContaining('Error: Validation failed'),
      type: 'Error',
      statusCode: 422,
      payload: {
        error: 'Unprocessable Entity',
        message: 'Validation failed: field is required'
      }
    })
  })

  test('enhances message with Boom data in non-prod environment', () => {
    const boomError = new Error('Unauthorized')
    boomError.isBoom = true
    boomError.output = {
      statusCode: 401,
      payload: { error: 'Unauthorized', message: 'Unauthorized' }
    }
    boomError.data = { reason: 'Token issuer not recognised' }

    const result = errorSerializer(boomError)

    expect(result.message).toContain('Unauthorized')
    expect(result.message).toContain('Token issuer not recognised')
  })

  test('falls back to [unserializable] when Boom data has circular references', () => {
    const circular = {}
    circular.self = circular

    const boomError = new Error('Bad gateway')
    boomError.isBoom = true
    boomError.output = {
      statusCode: 502,
      payload: { error: 'Bad Gateway', message: 'Bad gateway' }
    }
    boomError.data = circular

    const result = errorSerializer(boomError)

    expect(result.message).toBe('Bad gateway | data: [unserializable]')
  })
})

describe('loggerOptions in production environment', () => {
  afterEach(() => {
    config.reset('cdpEnvironment')
  })

  test('excludes Boom error details in prod environment', () => {
    config.set('cdpEnvironment', 'prod')
    const { err: errorSerializer } = loggerOptions.serializers

    const boomError = new Error('Validation failed')
    boomError.isBoom = true
    boomError.output = {
      statusCode: 422,
      payload: { error: 'Unprocessable Entity', message: 'Sensitive details' }
    }
    boomError.data = { sensitiveInfo: 'should not appear' }

    const result = errorSerializer(boomError)

    expect(result).toStrictEqual({
      message: 'Validation failed',
      stack_trace: expect.stringContaining('Error: Validation failed'),
      type: 'Error'
    })
    expect(result.statusCode).toBeUndefined()
    expect(result.payload).toBeUndefined()
    expect(result.message).not.toContain('sensitiveInfo')
  })
})
