import { fetchUserOrganisations } from '#server/auth/helpers/fetch-user-organisations.js'
import Joi from 'joi'
import { linkOrganisation } from './helpers/link-organisation.js'
import { provideUserOrganisations } from './prerequisites/provide-user-organisations.js'
import { buildLinkingViewData } from './view-data.js'

/**
 * Payload for POST /account/linking, validated by the Joi schema below.
 * @typedef {{ organisationNumber: string }} LinkingPayload
 */

/**
 * @param {HapiRequest} request
 * @param {ResponseToolkit} h
 * @param {UserOrganisations} organisations
 */
function viewNoSelectionError(request, h, organisations) {
  const viewData = buildLinkingViewData(request, organisations, {
    errors: {
      organisationNumber: {
        text: request.t('account:linking:errorNoSelection')
      }
    }
  })

  return h.view('account/linking/index', viewData).takeover()
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const controller = {
  options: {
    pre: [provideUserOrganisations],
    validate: {
      payload: Joi.object({
        organisationNumber: Joi.string().required()
      }),
      /**
       * @param {HapiRequest} request
       * @param {ResponseToolkit} h
       */
      failAction: async (request, h) => {
        const session = request.auth.credentials

        const organisations = await fetchUserOrganisations(session.backendToken)

        return viewNoSelectionError(request, h, organisations)
      }
    }
  },
  /**
   * @param {HapiRequest & { payload: LinkingPayload, pre: UserOrganisationsPres }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationNumber } = request.payload

    const session = request.auth.credentials

    const organisations = request.pre.userOrganisations

    const organisation = organisations.unlinked.find(
      (o) => String(o.orgId) === organisationNumber
    )

    if (!organisation) {
      return viewNoSelectionError(request, h, organisations)
    }

    await linkOrganisation(session.backendToken, organisationNumber)

    // Store linked organisation ID in session for navigation
    const sessionId = request.state?.userSession?.sessionId
    if (sessionId) {
      session.linkedOrganisationId = organisation.id
      await request.server.app.cache.set(sessionId, session)
    }

    return h.redirect(`/organisations/${organisationNumber}`)
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { UserOrganisations } from '#server/auth/types/organisations.js'
 * @import { UserOrganisationsPres } from './prerequisites/provide-user-organisations.js'
 */
