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

    const viewData = buildCheckDetailsViewData(request, {
      registration,
      accreditation,
      organisationId,
      registrationId
    })

    return h.view('prns/check-details', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
