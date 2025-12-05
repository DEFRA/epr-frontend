import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { provideAuthedUser } from '#server/logout/prerequisites/provide-authed-user.js'
import Joi from 'joi'
import { buildLinkingViewData } from './view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  options: {
    pre: [provideAuthedUser],
    validate: {
      payload: Joi.object({
        organisationId: Joi.string().required()
      }),
      failAction: async (request, h) => {
        const { ok, value: authedUser } = await getUserSession(request)

        // TODO should this not just be an error?
        if (!ok || !authedUser) {
          return h.redirect('/login').takeover()
        }

        const viewData = buildLinkingViewData(request, authedUser, {
          errors: {
            organisationId: {
              text: request.t('account:linking:errorNoSelection')
            }
          }
        })

        return h.view('account/linking/index', viewData).takeover()
      }
    }
  },
  handler(request, h) {
    // const { organisationId } = request.payload

    // TODO handle the linking logic here

    return h.redirect('/account')
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
