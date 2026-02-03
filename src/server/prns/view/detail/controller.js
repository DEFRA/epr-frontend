import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getRequiredPrn } from '#server/common/helpers/prns/get-required-prn.js'
import { buildDetailViewData } from './view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const detailController = {
  async handler(request, h) {
    const { organisationId, registrationId, prnId } = request.params
    const session = request.auth.credentials

    const { registration, accreditation } =
      await getRequiredRegistrationWithAccreditation(
        organisationId,
        registrationId,
        session.idToken,
        request.logger
      )

    const prnData = await getRequiredPrn(
      organisationId,
      accreditation.id,
      prnId,
      request.logger
    )

    const viewData = buildDetailViewData(request, {
      registration,
      organisationId,
      registrationId,
      prnData
    })

    return h.view('prns/view/detail/detail', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
