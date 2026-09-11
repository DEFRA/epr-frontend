import { statusCodes } from '#server/common/constants/status-codes.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect, vi } from 'vitest'

vi.spyOn(metrics.signIn, 'attempted').mockResolvedValue()

describe('#loginController - integration', () => {
  describe('login flow', () => {
    const languages = [
      { lang: 'cy', url: '/cy/login' },
      { lang: 'en', url: '/login' }
    ]

    it.for(languages)(
      'should redirect to oidc provider (lang: $lang)',
      async ({ url }, { server }) => {
        const response = await server.inject({
          method: 'GET',
          url
        })

        expect(response.statusCode).toBe(statusCodes.found)

        const redirectUrl = new URL(
          /** @type {string} */ (response.headers.location)
        )

        expect(redirectUrl.host).toBe('defra-id.auth')
        expect(redirectUrl.pathname).toBe('/authorize')
      }
    )

    it.for(languages)(
      'records sign in attempt metric (lang: $lang)',
      async ({ url }, { server }) => {
        await server.inject({
          method: 'GET',
          url
        })

        expect(metrics.signIn.attempted).toHaveBeenCalledTimes(1)
        expect(metrics.signIn.attempted).toHaveBeenCalledWith('defra-id')
      }
    )
  })
})
