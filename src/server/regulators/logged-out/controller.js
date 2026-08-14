import { paths } from '#server/paths.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * The page a regulator lands on after signing out. A regulator signs in with
 * Entra ID, so the way back in is the regulator route rather than the
 * operator one, and the service they left is the regulator service.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const controller = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    if (request.auth.credentials) {
      return h.redirect(request.localiseUrl(paths.regulators.home))
    }

    const { t: localise } = request

    return h.view('regulators/logged-out/index', {
      pageTitle: localise('regulators:loggedOut:pageTitle'),
      serviceName: localise('regulators:serviceName'),
      serviceUrl: paths.regulators.home,
      signInAgainHref: request.localiseUrl(paths.auth.entraId.login)
    })
  }
}

export { controller }
