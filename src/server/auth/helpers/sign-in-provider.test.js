import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { paths } from '#server/paths.js'
import { SIGN_IN_PROVIDER_COOKIE, signedOutPage } from './sign-in-provider.js'

const buildRequest = (state = {}) => ({
  path: paths.regulators.home,
  info: { hostname: 'epr-frontend.example.test' },
  state,
  logger: { info: vi.fn() }
})

const expectedLog = (
  /** @type {string} */ outcome,
  /** @type {string} */ cookie
) => ({
  message: `Signed-out redirect to the ${outcome} page, signInProvider cookie ${cookie}`,
  event: { action: 'signed-out-redirect', kind: 'event', outcome },
  url: { path: paths.regulators.home, domain: 'epr-frontend.example.test' }
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

    expect(signedOutPage(/** @type {any} */ (request))).toBe(
      paths.regulators.loggedOut
    )
    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog('regulator', 'present')
    )
  })

  test('logs an operator outcome when the cookie is absent', () => {
    const request = buildRequest()

    expect(signedOutPage(/** @type {any} */ (request))).toBe(paths.loggedOut)
    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog('operator', 'absent')
    )
  })

  test('logs an operator outcome when the cookie is present but the flag is off', () => {
    config.set('featureFlags.regulatorAccess', false)
    const request = buildRequest({ [SIGN_IN_PROVIDER_COOKIE]: OIDC_ENTRA_ID })

    expect(signedOutPage(/** @type {any} */ (request))).toBe(paths.loggedOut)
    expect(request.logger.info).toHaveBeenCalledWith(
      expectedLog('operator', 'present')
    )
  })
})
