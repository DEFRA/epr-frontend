/**
 * Logged out confirmation controller
 * Displays confirmation page after user has been logged out
 * @satisfies {Partial<ServerRoute>}
 */

const controller = {
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
 * @import { ServerRoute } from '@hapi/hapi'
 */
