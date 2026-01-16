import { provideAuthedUser } from '#server/logout/prerequisites/provide-authed-user.js'

export const EMAIL_NOT_RECOGNISED_PATH = '/email-not-recognised'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  options: {
    pre: [provideAuthedUser]
  },
  handler(request, h) {
    return h.view('account/email-not-recognised/index', {
      pageTitle: request.t('account:emailNotRecognised:pageTitle')
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
