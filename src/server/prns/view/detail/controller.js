import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { buildDetailViewData } from './view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const detailController = {
  async handler(request, h) {
    const { organisationId, registrationId, prnNumber } = request.params
    const session = request.auth.credentials

    const { registration } = await getRequiredRegistrationWithAccreditation(
      organisationId,
      registrationId,
      session.idToken,
      request.logger
    )

    const viewData = buildDetailViewData(request, {
      registration,
      organisationId,
      registrationId,
      prnNumber
    })

    return h.view('prns/view/detail/detail', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
