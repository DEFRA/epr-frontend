import { config } from '#config/config.js'
import { buildProviderSignOutUrl } from '#server/auth/helpers/provider-sign-out-url.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { mockHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 */

const APP_HOST = 'localhost:3000'
const APP_BASE_URL = `http://${APP_HOST}`
const POST_LOGOUT_REDIRECT_URI = encodeURIComponent(
  `${APP_BASE_URL}/auth/logout`
)

/** @returns {HapiRequest} */
const requestFrom = () =>
  mockHapiRequest({
    headers: {},
    info: { host: APP_HOST },
    server: { info: { protocol: 'http' } }
  })

/**
 * @param {string} logout
 * @returns {UserSession}
 */
const sessionWithLogoutUrl = (logout) =>
  buildMockAuth({
    idToken: 'id-token-123',
    urls: { token: 'http://oidc-provider/token', logout }
  }).credentials

describe(buildProviderSignOutUrl, () => {
  afterEach(() => {
    config.reset('appBaseUrl')
  })

  it('asks the provider to end its own session and send the person back', () => {
    config.set('appBaseUrl', APP_BASE_URL)

    const url = buildProviderSignOutUrl(
      requestFrom(),
      sessionWithLogoutUrl('http://oidc-provider/logout')
    )

    expect(url).toBe(
      `http://oidc-provider/logout?id_token_hint=id-token-123&post_logout_redirect_uri=${POST_LOGOUT_REDIRECT_URI}`
    )
  })

  it('keeps the query the provider already puts on its end session endpoint', () => {
    config.set('appBaseUrl', APP_BASE_URL)

    const url = buildProviderSignOutUrl(
      requestFrom(),
      sessionWithLogoutUrl(
        'http://oidc-provider/logout?p=a-b2clogin-query-param'
      )
    )

    expect(url).toBe(
      `http://oidc-provider/logout?p=a-b2clogin-query-param&id_token_hint=id-token-123&post_logout_redirect_uri=${POST_LOGOUT_REDIRECT_URI}`
    )
  })
})
