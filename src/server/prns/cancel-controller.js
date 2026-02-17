import Boom from '@hapi/boom'

import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { getSafeRedirect } from '#utils/get-safe-redirect.js'
import {
  fetchPrnContext,
  fetchPrnForUpdate
} from './helpers/fetch-prn-context.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const cancelGetController = {
  async handler(request, h) {
    const { registration, prn, basePath, prnId } =
      await fetchPrnContext(request)
    const { t: localise } = request
    const { organisationId, registrationId, accreditationId } = request.params

    if (prn.status !== 'awaiting_cancellation') {
<<<<<<< Updated upstream
      return h.redirect(getSafeRedirect(basePath))
=======
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
      )
>>>>>>> Stashed changes
    }

    const { noteType } = getNoteTypeDisplayNames(registration)

    return h.view('prns/cancel', {
      pageTitle: localise('prns:cancel:pageTitle', { noteType }),
      heading: localise('prns:cancel:heading', { noteType }),
      bodyText: localise('prns:cancel:bodyText', { noteType }),
      warningText: localise('prns:cancel:warningText'),
      confirmButton: localise('prns:cancel:confirmButton'),
      backUrl: `${basePath}/${prnId}`
    })
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const cancelPostController = {
  async handler(request, h) {
    const {
      organisationId,
      registrationId,
      accreditationId,
      prnId,
      prn,
      idToken
    } = await fetchPrnForUpdate(request)

    const {
      organisationId: orgId,
      registrationId: regId,
      accreditationId: accId,
      prnId: noteId
    } = request.params

    if (prn.status !== 'awaiting_cancellation') {
<<<<<<< Updated upstream
      return h.redirect(getSafeRedirect(basePath))
=======
      return h.redirect(
        `/organisations/${orgId}/registrations/${regId}/accreditations/${accId}/packaging-recycling-notes`
      )
>>>>>>> Stashed changes
    }

    try {
      await updatePrnStatus(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        { status: 'cancelled' },
        idToken
      )

<<<<<<< Updated upstream
      return h.redirect(getSafeRedirect(`${basePath}/${prnId}/cancelled`))
=======
      return h.redirect(
        `/organisations/${orgId}/registrations/${regId}/accreditations/${accId}/packaging-recycling-notes/${noteId}/cancelled`
      )
>>>>>>> Stashed changes
    } catch (error) {
      request.logger.error({ error }, 'Failed to cancel PRN')

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation('Failed to cancel PRN')
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
