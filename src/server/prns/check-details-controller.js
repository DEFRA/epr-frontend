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
      recipient: 'Acme Packaging Solutions Ltd',
      tonnage: 150,
      decemberWaste: 'No',
      issuedDate: '28 January 2026',
      issuedBy: 'John Smith',
      authorisedBy: 'Jane Doe',
      position: 'Operations Manager',
      issuerNotes: 'Quarterly waste collection from Birmingham facility'
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
