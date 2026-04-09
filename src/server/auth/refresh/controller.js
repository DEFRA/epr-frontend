import { paths } from '#server/paths.js'

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */

/**
 * Validates that a returnTo URL is a safe same-origin path.
 * Rejects absolute URLs, protocol-relative URLs, and non-string values.
 * @param {unknown} value
 * @returns {boolean}
 */
function isSafeReturnTo(value) {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
  )
}

/**
 * Controller for the /auth/refresh endpoint.
 * Performs a blocking token refresh and redirects back to the original page.
 * This endpoint exists so that the slow OIDC round-trip happens on a
 * dedicated URL rather than inflating average page response times.
 */
const controller = {
  options: {
    auth: 'session'
  },
  /**
   * @param {Request} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    const userSession = request.auth.credentials
    const returnTo = isSafeReturnTo(request.query.returnTo)
      ? request.query.returnTo
      : '/'

    const result = await request.server.app.blockingRefresh(
      request,
      userSession
    )

    if (result.isValid) {
      return h.redirect(returnTo)
    }

    return h.redirect(request.localiseUrl(paths.loggedOut))
  }
}

export { controller }
