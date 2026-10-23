import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { paths } from '#server/paths.js'
import {
  asResponseToolkit,
  mockHapiRequest
} from '#server/common/test-helpers/request-fixtures.js'
import {
  SIGN_IN_PROVIDER_COOKIE,
  redirectToSignedOut,
  signedOutPage
} from './sign-in-provider.js'

const buildRequest = (
  /** @type {Record<string, unknown>} */ state = {},
  /** @type {string | undefined} */ cookieHeader = undefined
) => ({
  headers: cookieHeader === undefined ? {} : { cookie: cookieHeader },
  state,
  logger: { info: vi.fn() },
  localiseUrl: vi.fn((/** @type {string} */ url) => `/en${url}`)
})

describe(signedOutPage, () => {
  beforeEach(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterEach(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  test('chooses the regulator page when the cookie is present', () => {
    const request = buildRequest({ [SIGN_IN_PROVIDER_COOKIE]: OIDC_ENTRA_ID })

    expect(signedOutPage(mockHapiRequest(request))).toStrictEqual({
      page: paths.regulators.loggedOut,
      reason: `signInProvider cookie ${OIDC_ENTRA_ID}, session cookie absent`
    })
  })

  test('chooses the operator page when the cookie is absent', () => {
    expect(signedOutPage(mockHapiRequest(buildRequest()))).toStrictEqual({
      page: paths.loggedOut,
      reason: 'signInProvider cookie absent, session cookie absent'
    })
  })

  test('chooses the operator page when the cookie is present but the flag is off', () => {
    config.set('featureFlags.regulatorAccess', false)
    const request = buildRequest({ [SIGN_IN_PROVIDER_COOKIE]: OIDC_ENTRA_ID })

    expect(signedOutPage(mockHapiRequest(request))).toStrictEqual({
      page: paths.loggedOut,
      reason: `signInProvider cookie ${OIDC_ENTRA_ID}, session cookie absent`
    })
  })

  test('gives a provider value that is not Entra as itself', () => {
    const request = buildRequest({
      [SIGN_IN_PROVIDER_COOKIE]: 'other-provider'
    })

    expect(signedOutPage(mockHapiRequest(request))).toStrictEqual({
      page: paths.loggedOut,
      reason: 'signInProvider cookie other-provider, session cookie absent'
    })
  })

  test.each([
    ['not a string', { nested: 'object' }],
    ['not shaped like a provider id', 'x'.repeat(33)],
    ['carrying markup', '<script>alert(1)</script>']
  ])('gives a provider value that is %s as invalid', (_label, value) => {
    const request = buildRequest({ [SIGN_IN_PROVIDER_COOKIE]: value })

    expect(signedOutPage(mockHapiRequest(request)).reason).toBe(
      'signInProvider cookie invalid, session cookie absent'
    )
  })

  test('gives a provider cookie sent twice as a duplicate', () => {
    const request = buildRequest({
      [SIGN_IN_PROVIDER_COOKIE]: [OIDC_ENTRA_ID, 'Not A Provider']
    })

    expect(signedOutPage(mockHapiRequest(request))).toStrictEqual({
      page: paths.loggedOut,
      reason: `signInProvider cookie duplicate(${OIDC_ENTRA_ID},invalid), session cookie absent`
    })
  })

  test('says the session cookie arrived', () => {
    const request = buildRequest(
      { userSession: { sessionId: 'a-session' } },
      'other=1; userSession=sealed'
    )

    expect(signedOutPage(mockHapiRequest(request)).reason).toBe(
      'signInProvider cookie absent, session cookie present'
    )
  })

  test('says a session cookie that was sent but could not be read is unreadable', () => {
    const request = buildRequest({}, 'userSession=Fe26.2**old-password-seal')

    expect(signedOutPage(mockHapiRequest(request)).reason).toBe(
      'signInProvider cookie absent, session cookie unreadable'
    )
  })
})

describe(redirectToSignedOut, () => {
  beforeEach(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterEach(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  test.each([
    [
      'a regulator',
      { [SIGN_IN_PROVIDER_COOKIE]: OIDC_ENTRA_ID },
      paths.regulators.loggedOut,
      `signInProvider cookie ${OIDC_ENTRA_ID}, session cookie absent`
    ],
    [
      'an operator',
      {},
      paths.loggedOut,
      'signInProvider cookie absent, session cookie absent'
    ]
  ])(
    'logs why it redirects %s and redirects there',
    (_label, state, page, reason) => {
      const request = buildRequest(state)
      const redirect = vi.fn(() => 'redirected')

      const response = redirectToSignedOut(
        mockHapiRequest(request),
        asResponseToolkit({ redirect })
      )

      expect(request.logger.info).toHaveBeenCalledWith({
        message: 'Signed-out redirect',
        event: {
          action: 'signed-out-redirect',
          kind: 'event',
          outcome: 'success',
          reason,
          reference: page
        }
      })
      expect(redirect).toHaveBeenCalledWith(`/en${page}`)
      expect(response).toBe('redirected')
    }
  )
})
