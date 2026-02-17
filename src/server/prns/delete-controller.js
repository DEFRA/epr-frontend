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
export const deleteGetController = {
  async handler(request, h) {
    const { registration, prn, basePath, prnId } =
      await fetchPrnContext(request)
    const { t: localise } = request
    const { organisationId, registrationId, accreditationId } = request.params

    if (prn.status !== 'awaiting_authorisation') {
<<<<<<< Updated upstream
      return h.redirect(getSafeRedirect(basePath))
=======
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
      )
>>>>>>> Stashed changes
    }

    const { noteType } = getNoteTypeDisplayNames(registration)

    return h.view('prns/delete', {
      pageTitle: localise('prns:delete:pageTitle', { noteType }),
      heading: localise('prns:delete:heading', { noteType }),
      warningText: localise('prns:delete:warningText', { noteType }),
      confirmButton: localise('prns:delete:confirmButton', { noteType }),
      backUrl: `${basePath}/${prnId}`
    })
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const deletePostController = {
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
      accreditationId: accId
    } = request.params

    const prnBasePath = `/organisations/${orgId}/registrations/${regId}/accreditations/${accId}/packaging-recycling-notes`

    if (prn.status !== 'awaiting_authorisation') {
<<<<<<< Updated upstream
      return h.redirect(getSafeRedirect(basePath))
=======
      return h.redirect(prnBasePath)
>>>>>>> Stashed changes
    }

    try {
      await updatePrnStatus(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        { status: 'deleted' },
        idToken
      )

<<<<<<< Updated upstream
      return h.redirect(getSafeRedirect(basePath))
=======
      return h.redirect(prnBasePath)
>>>>>>> Stashed changes
    } catch (error) {
      request.logger.error({ error }, 'Failed to delete PRN')

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation('Failed to delete PRN')
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
