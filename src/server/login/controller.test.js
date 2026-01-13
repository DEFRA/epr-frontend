import { statusCodes } from '#server/common/constants/status-codes.js'
import { describe, expect } from 'vitest'
import { it } from '#vite/fixtures/server.js'

describe('#loginController - integration', () => {
  describe('login flow', () => {
    it.for([
      { lang: 'cy', url: '/cy/login' },
      { lang: 'en', url: '/login' }
    ])(
      'should redirect to oidc provider (lang: $lang)',
      async ({ url }, { server }) => {
        const response = await server.inject({
          method: 'GET',
          url
        })

        expect(response.statusCode).toBe(statusCodes.found)
        expect(response.headers.location).toContain('/authorize')
      }
    )
  })
})
