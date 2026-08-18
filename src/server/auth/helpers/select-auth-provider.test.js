import { selectAuthProvider } from '#server/auth/helpers/select-auth-provider.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { describe, expect, it } from 'vitest'

/**
 * @import { AuthProvider } from '#server/auth/types/auth-provider.js'
 */

const defraId = /** @type {AuthProvider} */ ({ tokenRequestParams: {} })
const entraId = /** @type {AuthProvider} */ ({ tokenRequestParams: {} })

describe(selectAuthProvider, () => {
  it('finds the provider that issued the session', () => {
    expect(
      selectAuthProvider(
        { [OIDC_DEFRA_ID]: defraId, [OIDC_ENTRA_ID]: entraId },
        OIDC_ENTRA_ID
      )
    ).toBe(entraId)
  })

  it('refuses a session from a provider this server does not hold', () => {
    expect(() =>
      selectAuthProvider({ [OIDC_DEFRA_ID]: defraId }, OIDC_ENTRA_ID)
    ).toThrow("Cannot refresh token: no auth provider for 'entra-id'")
  })
})
