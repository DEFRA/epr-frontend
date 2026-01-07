import { getUserSession } from '#server/auth/helpers/get-user-session.js'

/**
 * Logged out confirmation controller
 * Displays confirmation page after user has been logged out
 * @satisfies {Partial<ServerRoute>}
 */

const controller = {
  async handler(request, h) {
    const { t: localise } = request
    const { value: userSession } = await getUserSession(request)

    if (userSession) {
      // If user is not logged out, redirect to home page
      return h.redirect('/')
    }

    return h.view('logged-out/index', {
      pageTitle: localise('logged-out:pageTitle')
    })
  }
}

export { controller }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
