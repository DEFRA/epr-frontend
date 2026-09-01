import { config } from '#config/config.js'
import { SELECT_ACCOUNT_QUERY } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */
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
        expect(mockSignInAttemptedMetric).toHaveBeenCalledWith('entra-id')
      }
    )
  })

  describe('the account prompt in the authorize request', () => {
    /**
     * @param {HapiServer} server
     * @param {string} url
     */
    const promptAskedFor = async (server, url) => {
      const response = await server.inject({ method: 'GET', url })

      return new URL(
        /** @type {string} */ (response.headers.location)
      ).searchParams.get('prompt')
    }

    it('asks Entra ID for an account picker when the sign in is marked for one', async ({
      server
    }) => {
      await expect(
        promptAskedFor(server, `/regulators/login?${SELECT_ACCOUNT_QUERY}`)
      ).resolves.toBe('select_account')
    })

    it('asks for no picker on an ordinary sign in, so a regulator with one account is not interrupted', async ({
      server
    }) => {
      await expect(
        promptAskedFor(server, '/regulators/login')
      ).resolves.toBeNull()
    })
  })
})
