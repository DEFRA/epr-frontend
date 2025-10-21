import { describe, beforeAll, afterAll, it, expect } from 'vitest'
import { createServer } from '~/src/server/index.js'
import { cspFormAction } from '~/src/server/common/helpers/content-security-policy.js'

describe(cspFormAction, () => {
  it.each([
    ['development', { isDevelopment: true }, ['self', 'localhost:*']],
    ['production', { isDevelopment: false }, ['self']]
  ])('should use %s values', (_, config, value) => {
    expect(cspFormAction(config)).toStrictEqual(value)
  })
})

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('should set the CSP policy header', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })
})
