import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { paths } from '#server/paths.js'
import { mockHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
import { SIGN_IN_PROVIDER_COOKIE, signedOutPage } from './sign-in-provider.js'

const buildRequest = (state = {}) => ({
  state,
  logger: { info: vi.fn() }
})

const expectedLog = (
  /** @type {string} */ page,
  /** @type {string} */ cookie
) => ({
  message: `Signed-out redirect to ${page}, signInProvider cookie ${cookie}`,
  event: {
    action: 'signed-out-redirect',
    kind: 'event',
    outcome: 'success',
    reason: `signInProvider cookie ${cookie}`,
    reference: page
  }
})

describe(signedOutPage, () => {
  beforeEach(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterEach(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  test('logs a regulator outcome when the cookie is present', () => {
    const request = buildRequest({ [SIGN_IN_PROVIDER_COOKIE]: OIDC_ENTRA_ID })

    expect(signedOutPage(mockHapiRequest(request))).toBe(
      paths.regulators.loggedOut
    )
    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog(paths.regulators.loggedOut, 'present')
    )
  })

  test('logs an operator outcome when the cookie is absent', () => {
    const request = buildRequest()

    expect(signedOutPage(mockHapiRequest(request))).toBe(paths.loggedOut)
    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog(paths.loggedOut, 'absent')
    )
  })

  test('logs an operator outcome when the cookie is present but the flag is off', () => {
    config.set('featureFlags.regulatorAccess', false)
    const request = buildRequest({ [SIGN_IN_PROVIDER_COOKIE]: OIDC_ENTRA_ID })

    expect(signedOutPage(mockHapiRequest(request))).toBe(paths.loggedOut)
    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog(paths.loggedOut, 'present')
    )
  })
})
