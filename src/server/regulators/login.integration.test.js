import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

const mockSignInAttemptedMetric = vi.fn()

vi.mock(
  import('#server/common/helpers/metrics/index.js'),
  async (importOriginal) => ({
    metrics: {
      ...(await importOriginal()).metrics,
      signInAttempted: (oidcProvider) => mockSignInAttemptedMetric(oidcProvider)
    }
  })
)

describe('#regulatorsLoginController - integration', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  describe('regulators login flow', () => {
    const languages = [
      { lang: 'cy', url: '/cy/regulators/login' },
      { lang: 'en', url: '/regulators/login' }
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

        expect(redirectUrl.host).toBe('entra-id.auth')
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
        expect(mockSignInAttemptedMetric).toHaveBeenCalledWith(OIDC_ENTRA_ID)
      }
    )
  })
})
