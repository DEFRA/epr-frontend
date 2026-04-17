import { describe, expect, it } from 'vitest'
import { validateRefreshedTokens } from './refreshed-tokens-schema.js'

describe(validateRefreshedTokens, () => {
  it('returns the payload when required fields are present', () => {
    const payload = {
      id_token: 'new-id-token',
      refresh_token: 'new-refresh-token'
    }

    expect(validateRefreshedTokens(payload)).toStrictEqual(payload)
  })

  it('passes extra OIDC response fields through unchanged', () => {
    const payload = {
      id_token: 'new-id-token',
      refresh_token: 'new-refresh-token',
      access_token: 'unused-access-token',
      expires_in: 3600,
      token_type: 'Bearer'
    }

    expect(validateRefreshedTokens(payload)).toStrictEqual(payload)
  })

  it('throws when id_token is missing', () => {
    expect(() =>
      validateRefreshedTokens({ refresh_token: 'new-refresh-token' })
    ).toThrow(/Invalid refreshed tokens.*id_token/)
  })

  it('throws when refresh_token is missing', () => {
    expect(() => validateRefreshedTokens({ id_token: 'new-id-token' })).toThrow(
      /Invalid refreshed tokens.*refresh_token/
    )
  })

  it('throws when id_token is not a string', () => {
    expect(() =>
      validateRefreshedTokens({
        id_token: 123,
        refresh_token: 'new-refresh-token'
      })
    ).toThrow(/Invalid refreshed tokens.*id_token/)
  })

  it('throws when payload is not an object', () => {
    expect(() => validateRefreshedTokens('not-an-object')).toThrow(
      /Invalid refreshed tokens/
    )
  })

  it('reports every failing field in a single error', () => {
    expect(() => validateRefreshedTokens({})).toThrow(
      /id_token.*refresh_token|refresh_token.*id_token/
    )
  })
})
