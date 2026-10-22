import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { paths } from '#server/paths.js'
import { mockHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
import { SIGN_IN_PROVIDER_COOKIE, signedOutPage } from './sign-in-provider.js'

const buildRequest = (/** @type {Record<string, unknown>} */ state = {}) => ({
  state,
  logger: { info: vi.fn() }
})

const expectedLog = (
  /** @type {string} */ page,
  /** @type {string} */ reason
) => ({
  message: `Signed-out redirect to ${page}, ${reason}`,
  event: {
    action: 'signed-out-redirect',
    kind: 'event',
    outcome: 'success',
    reason,
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
      expectedLog(
        paths.regulators.loggedOut,
        `signInProvider cookie ${OIDC_ENTRA_ID}, session cookie absent`
      )
    )
  })

  test('logs an operator outcome when the cookie is absent', () => {
    const request = buildRequest()

    expect(signedOutPage(mockHapiRequest(request))).toBe(paths.loggedOut)
    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog(
        paths.loggedOut,
        'signInProvider cookie absent, session cookie absent'
      )
    )
  })

  test('logs an operator outcome when the cookie is present but the flag is off', () => {
    config.set('featureFlags.regulatorAccess', false)
    const request = buildRequest({ [SIGN_IN_PROVIDER_COOKIE]: OIDC_ENTRA_ID })

    expect(signedOutPage(mockHapiRequest(request))).toBe(paths.loggedOut)
    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog(
        paths.loggedOut,
        `signInProvider cookie ${OIDC_ENTRA_ID}, session cookie absent`
      )
    )
  })

  test('logs a provider value that is not Entra as itself', () => {
    const request = buildRequest({
      [SIGN_IN_PROVIDER_COOKIE]: 'other-provider'
    })

    expect(signedOutPage(mockHapiRequest(request))).toBe(paths.loggedOut)
    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog(
        paths.loggedOut,
        'signInProvider cookie other-provider, session cookie absent'
      )
    )
  })

  test('logs that the session cookie arrived', () => {
    const request = buildRequest({ userSession: { sessionId: 'a-session' } })

    signedOutPage(mockHapiRequest(request))

    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog(
        paths.loggedOut,
        'signInProvider cookie absent, session cookie present'
      )
    )
  })

  test.each([
    ['not a string', { nested: 'object' }],
    ['not shaped like a provider id', 'x'.repeat(33)],
    ['carries markup', '<script>alert(1)</script>']
  ])('logs a provider value that is %s as invalid', (_label, value) => {
    const request = buildRequest({ [SIGN_IN_PROVIDER_COOKIE]: value })

    signedOutPage(mockHapiRequest(request))

    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog(
        paths.loggedOut,
        'signInProvider cookie invalid, session cookie absent'
      )
    )
  })
})
