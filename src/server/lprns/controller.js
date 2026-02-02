import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { buildCreatePrnViewData } from './view-data.js'

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
export const controller = {
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

    const viewData = buildCreatePrnViewData(request, {
      registration,
      recipients: STUB_RECIPIENTS
    })

    return h.view('lprns/create', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
