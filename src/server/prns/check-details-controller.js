import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { buildCheckDetailsViewData } from './check-details-view-data.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const checkDetailsController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId } = request.params
    const session = request.auth.credentials

    const { registration, accreditation } =
      await getRegistrationWithAccreditation(
        organisationId,
        registrationId,
        session.idToken
      )

    if (!registration) {
      request.logger.warn({ registrationId }, 'Registration not found')
      throw Boom.notFound('Registration not found')
    }

    if (!accreditation) {
      request.logger.warn(
        { registrationId },
        'Not accredited for this registration'
      )
      throw Boom.notFound('Not accredited for this registration')
    }

    // TODO: Remove dummy data once form is implemented
    const prnData = {
      recipient: 'Acme Packaging Solutions Ltd',
      tonnage: '150.75',
      tonnageInWords: 'One hundred and fifty point seven five',
      processToBeUsed: 'Mechanical recycling',
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
