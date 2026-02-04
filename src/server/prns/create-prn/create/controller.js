import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'

import { buildCreateViewData } from './view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const createController = {
  async handler(request, h) {
    const { organisationId, registrationId } = request.params
    const session = request.auth.credentials

    const { registration } = await getRequiredRegistrationWithAccreditation(
      organisationId,
      registrationId,
      session.idToken,
      request.logger
    )

    const { organisations } =
      await request.wasteOrganisationsService.getOrganisations()

    const viewData = buildCreateViewData(request, {
      organisationId,
      recipients: organisations,
      registration,
      registrationId
    })

    return h.view('prns/create-prn/create/create', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
