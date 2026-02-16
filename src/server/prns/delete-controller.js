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

    if (prn.status !== 'awaiting_authorisation') {
      return h.redirect(getSafeRedirect(basePath))
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
      basePath,
      prn,
      idToken
    } = await fetchPrnForUpdate(request)

    if (prn.status !== 'awaiting_authorisation') {
      return h.redirect(getSafeRedirect(basePath))
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

      return h.redirect(getSafeRedirect(basePath))
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
