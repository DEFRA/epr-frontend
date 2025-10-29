import { languages } from '../common/constants/language-codes.js'

const getPath = (request) => {
  const lang = request.i18n?.language
  return lang === languages.WELSH ? '/cy/account' : '/account'
}

/**
 * Login controller
 * Triggers OIDC authentication flow by using 'defra-id' auth strategy
 * After successful authentication, redirects to home page
 * @satisfies {Partial<ServerRoute>}
 */
const loginController = {
  options: {
    auth: 'defra-id',
    ext: {
      onPreAuth: {
        method: (request, h) => {
          request.yar.flash('referrer', getPath(request))

          return h.continue
        }
      }
    }
  },
  /* @fixme: code coverage */
  /* v8 ignore next */
  handler: async (request, h) => h.redirect(getPath(request))
}

export { loginController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
