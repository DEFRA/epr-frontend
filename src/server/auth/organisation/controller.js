import { getSafeRedirect } from '#utils/get-safe-redirect.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
const controller = {
  options: {
    auth: 'defra-id'
  },
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler: async function (request, h) {
    // Should never be called as the user should no longer be authenticated with `defra-id` after initial sign in
    // The strategy should redirect the user to the sign in page and they will rejoin the service at the /auth/callback route
    // Adding as safeguard
    const redirect = request.yar.flash('referrer')?.at(0) ?? '/'

    // Ensure redirect is a relative path to prevent redirect attacks
    const safeRedirect = getSafeRedirect(redirect)
    return h.redirect(safeRedirect)
  }
}

export { controller }

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */
