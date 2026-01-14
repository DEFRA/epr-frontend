import { cspFormAction } from '#server/common/helpers/content-security-policy.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect, test } from 'vitest'

describe(cspFormAction, () => {
  test.each([
    ['non-production', { isProduction: false }, ['self', 'localhost:*']],
    ['production', { isProduction: true }, ['self']]
  ])('should use %s values', (_, config, values) => {
    expect(cspFormAction(config)).toStrictEqual(values)
  })
})

describe('#contentSecurityPolicy', () => {
  it('should set the CSP policy header', async ({ server }) => {
    const resp = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(resp.headers['content-security-policy']).toBe(
      [
        "base-uri 'self'",
        "connect-src 'self' wss data:",
        "default-src 'self'",
        "font-src 'self' data:",
        "form-action 'self' localhost:*",
        "frame-ancestors 'none'",
        "frame-src 'self' data:",
        "img-src 'self' data:",
        "manifest-src 'self'",
        "media-src 'self'",
        "object-src 'none'",
        "script-src 'self' 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='",
        "style-src 'self'",
        "worker-src 'self'"
      ].join(';')
    )
  })
})
