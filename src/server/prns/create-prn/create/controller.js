import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { buildCreateViewData } from './view-data.js'

// Stub recipients until real API is available
const STUB_RECIPIENTS = [
  { value: 'producer-1', text: 'Acme Packaging Ltd' },
  { value: 'producer-2', text: 'BigCo Waste Solutions' },
  { value: 'producer-3', text: 'EcoRecycle Industries' },
  { value: 'scheme-1', text: 'Green Compliance Scheme' },
  { value: 'scheme-2', text: 'National Packaging Scheme' }
]

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

    const viewData = buildCreateViewData(request, {
      registration,
      recipients: STUB_RECIPIENTS,
      organisationId,
      registrationId
    })

    return h.view('prns/create-prn/create/create', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
