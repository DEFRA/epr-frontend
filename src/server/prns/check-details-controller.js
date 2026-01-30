import { getValidatedRegistration } from './helpers/get-validated-registration.js'
import { buildCheckDetailsViewData } from './check-details-view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const checkDetailsController = {
  async handler(request, h) {
    const { registration, accreditation, organisationId, registrationId } =
      await getValidatedRegistration(request)

    // Temporary dummy data
    const prnData = {
      issuedToOrganisation: 'Acme Packaging Solutions Ltd',
      issuedByOrganisation: 'John Smith Ltd',
      issuedDate: '',
      issuerNotes: 'Quarterly waste collection from Birmingham facility',
      tonnageValue: 150,
      isDecemberWaste: 'No',
      authorisedBy: '',
      position: ''
    }

    const viewData = buildCheckDetailsViewData(request, {
      registration,
      accreditation,
      organisationId,
      registrationId,
      prnData
    })

    return h.view('prns/check-details', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
