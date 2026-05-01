import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
import Joi from 'joi'
import { linkOrganisation } from './helpers/link-organisation.js'
import { provideUserOrganisations } from './prerequisites/provide-user-organisations.js'
import { buildLinkingViewData } from './view-data.js'

/**
 * Payload for POST /account/linking, validated by the Joi schema below.
 * @typedef {{ organisationId: string }} LinkingPayload
 */

export const controller = {
  options: {
    pre: [provideUserOrganisations],
    validate: {
      payload: Joi.object({
        organisationId: Joi.string().required()
      }),
      /**
       * @param {HapiRequest} request
       * @param {ResponseToolkit} h
       */
      failAction: async (request, h) => {
        const session = request.auth.credentials

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
  /**
   * @param {HapiRequest & { payload: LinkingPayload }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId } = request.payload

    const session = request.auth.credentials

    await linkOrganisation(session.idToken, organisationId)

    // Store linked organisation ID in session for navigation
    const sessionId = request.state?.userSession?.sessionId
    if (sessionId) {
      session.linkedOrganisationId = organisationId
      await request.server.app.cache.set(sessionId, session)
    }

    return h.redirect(`/organisations/${organisationId}`)
  }
}

/**
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */
