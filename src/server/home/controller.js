import { ACCOUNT_LINKING_PATH } from '#server/account/linking/controller.js'
import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'

/**
 * Determines the appropriate href for the "Start now" button based on auth state
 * @param {Request} request - Hapi request object
 * @returns {Promise<string>} The href for the start button
 */
async function getStartNowHref(request) {
  const { ok, value: session } = await getUserSession(request)

  if (!ok || !session) {
    return request.localiseUrl('/login')
  }

  const organisations = await fetchUserOrganisations(session.idToken)

  if (organisations.linked) {
    return request.localiseUrl(`/organisations/${organisations.linked.id}`)
  }

  return request.localiseUrl(ACCOUNT_LINKING_PATH)
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  handler: async (request, h) => {
    const { t: localise } = request
    const startNowHref = await getStartNowHref(request)

    return h.view('home/index', {
      pageTitle: localise('home:pageTitle'),
      startNowHref
    })
  }
}

/**
 * Redirect handler for / to /start
 * @satisfies {Partial<ServerRoute>}
 */
export const redirectToStart = {
  handler(request, h) {
    return h.redirect(request.localiseUrl('/start'))
  }
}

/**
 * @import { ServerRoute, Request } from '@hapi/hapi'
 */
