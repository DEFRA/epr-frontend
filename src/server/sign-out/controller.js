/**
 * Sign out confirmation controller
 * Displays confirmation page after user has been signed out
 * @satisfies {Partial<ServerRoute>}
 */
const controller = {
  options: {
    auth: { mode: 'try' }
  },
  handler(request, h) {
    const { t: localise, localiseUrl } = request

    // Check if user came from proper logout flow
    // Flash message is set by logout controller before redirecting to Defra ID
    const signedOut = request.yar.flash('signedOut')?.at(0)

    if (!signedOut) {
      // Direct navigation - redirect to home
      const homeUrl = localiseUrl ? localiseUrl('/') : '/'
      return h.redirect(homeUrl)
    }

    return h.view('sign-out/index', {
      pageTitle: localise('sign-out:pageTitle')
    })
  }
}

export { controller }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
