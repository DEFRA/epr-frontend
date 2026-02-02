import { getPrn } from '#server/common/helpers/prns/get-prn.js'
import { getValidatedRegistration } from '../../helpers/get-validated-registration.js'
import { buildConfirmationViewData } from './view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const confirmationController = {
  async handler(request, h) {
    const { registration, accreditation, organisationId, registrationId } =
      await getValidatedRegistration(request)

    const { prnNumber } = request.params

    const prnData = await getPrn(
      organisationId,
      accreditation.id,
      prnNumber,
      request.logger
    )

    const viewData = buildConfirmationViewData(request, {
      registration,
      accreditation,
      organisationId,
      registrationId,
      prnData
    })

    return h.view('prns/issue-prn/confirmation/confirmation', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
