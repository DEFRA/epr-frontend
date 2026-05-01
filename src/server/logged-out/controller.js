/**
 * Logged out confirmation controller
 * Displays confirmation page after user has been logged out
 */

const controller = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    if (request.auth.credentials) {
      // If user is not logged out, redirect to home page
      return h.redirect('/')
    }

    const { t: localise } = request

    return h.view('logged-out/index', {
      pageTitle: localise('logged-out:pageTitle')
    })
  }
}

export { controller }

/**
 * @import { ServerRoute, ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
