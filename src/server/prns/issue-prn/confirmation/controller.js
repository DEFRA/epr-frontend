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

    // Temporary dummy data until PAE-944 backend is ready
    const prnData = {
      prnNumber,
      issuedToOrganisation: 'Nestle (SEPA)'
    }

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
