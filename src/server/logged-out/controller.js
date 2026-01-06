/**
 * Sign out confirmation controller
 * Displays confirmation page after user has been signed out
 * @satisfies {Partial<ServerRoute>}
 */

const controller = {
  handler(request, h) {
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
