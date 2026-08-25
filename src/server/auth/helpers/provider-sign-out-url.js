import { getRedirectUrl } from '#server/auth/helpers/get-redirect-url.js'
import { paths } from '#server/paths.js'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { UserSession } from '#server/auth/types/session.js'
 */

/**
 * @param {HapiRequest} request
 * @param {UserSession} session
 * @returns {string}
 */
const buildProviderSignOutUrl = (request, session) => {
  const providerSignOutUrl = new URL(session.urls.logout)

  providerSignOutUrl.searchParams.append('id_token_hint', session.idToken)
  providerSignOutUrl.searchParams.append(
    'post_logout_redirect_uri',
    getRedirectUrl(request, paths.auth.postLogoutRedirect)
  )

  return providerSignOutUrl.toString()
}

export { buildProviderSignOutUrl }
