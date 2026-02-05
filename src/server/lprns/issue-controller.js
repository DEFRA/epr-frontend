import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
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
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/issued`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to issue PRN')

      const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}`

      if (error.isBoom && error.output.statusCode === statusCodes.conflict) {
        return h.redirect(`${basePath}?error=insufficient_balance`)
      }

      // All other errors (including WB calculation failures) redirect to action page
      return h.redirect(`${basePath}?error=issue_failed`)
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
