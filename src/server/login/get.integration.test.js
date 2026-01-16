import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect, vi } from 'vitest'

const mockSignInAttemptedMetric = vi.fn()

vi.mock(
  import('#server/common/helpers/metrics/index.js'),
  async (importOriginal) => ({
    metrics: {
      ...(await importOriginal()).metrics,
      signInAttempted: () => mockSignInAttemptedMetric()
    }
  })
)

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

        const redirectUrl = new URL(response.headers.location)

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

        expect(mockSignInAttemptedMetric).toHaveBeenCalledTimes(1)
      }
    )
  })
})
