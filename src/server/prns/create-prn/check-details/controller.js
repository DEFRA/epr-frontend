import { getRequiredPrn } from '#server/common/helpers/prns/get-required-prn.js'
import { getValidatedRegistration } from '../../helpers/get-validated-registration.js'
import { buildCheckDetailsViewData } from './view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const checkDetailsController = {
  async handler(request, h) {
    const { registration, accreditation, organisationId, registrationId } =
      await getValidatedRegistration(request)

    const { prnNumber } = request.params

    const prnData = await getRequiredPrn(
      organisationId,
      accreditation.id,
      prnNumber,
      request.logger
    )

    const viewData = buildCheckDetailsViewData(request, {
      registration,
      accreditation,
      organisationId,
      registrationId,
      prnData
    })

    return h.view('prns/create-prn/check-details/check-details', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
