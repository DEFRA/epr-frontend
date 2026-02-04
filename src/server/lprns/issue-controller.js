import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const issueController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const session = request.auth.credentials

    try {
      await updatePrnStatus(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        { status: 'awaiting_acceptance' },
        session.idToken
      )

      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prnId}/issued`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to issue PRN')

      if (error.isBoom && error.output.statusCode === 409) {
        return h.redirect(
          `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prnId}/view?error=insufficient_balance`
        )
      }

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation('Failed to issue PRN')
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
