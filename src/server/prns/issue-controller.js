import { statusCodes } from '#server/common/constants/status-codes.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const issueController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const session = request.auth.credentials

    try {
      const updatedPrn = await updatePrnStatus(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        { status: 'awaiting_acceptance' },
        session.idToken
      )

      // Store prnNumber in session to mitigate MongoDB replication lag.
      // The issued page fetches the PRN fresh, but the write may not have
      // replicated yet, so the session value takes priority.
      request.yar.set('prnIssued', {
        id: prnId,
        prnNumber: updatedPrn.prnNumber
      })

      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/issued`
      )
    } catch (error) {
      request.logger.error({ err: error }, 'Failed to issue PRN')

      const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}`

      if (error.isBoom && error.output.statusCode === statusCodes.conflict) {
        return h.redirect(`/organisations/${organisationId}/error`)
      }

      // All other errors (including WB calculation failures) redirect to action page
      return h.redirect(`${basePath}?error=issue_failed`)
    }
  }
}

/**
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PrnDetailParams } from './helpers/session-types.js'
 */
