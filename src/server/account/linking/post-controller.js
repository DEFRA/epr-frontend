import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { provideAuthedUser } from '#server/logout/prerequisites/provide-authed-user.js'
import Joi from 'joi'
import { provideUserOrganisations } from './prerequisites/provide-user-organisations.js'
import { buildLinkingViewData } from './view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  options: {
    pre: [provideAuthedUser, provideUserOrganisations],
    validate: {
      payload: Joi.object({
        organisationId: Joi.string().required()
      }),
      failAction: async (request, h) => {
        const { ok, value: session } = await getUserSession(request)

        if (!ok || !session) {
          return h.redirect('/login').takeover()
        }

        const organisations = await fetchUserOrganisations(session.idToken)

        const viewData = buildLinkingViewData(request, organisations, {
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
