import Boom from '@hapi/boom'

import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
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

    if (prn.status !== 'awaiting_cancellation') {
      return h.redirect(basePath)
    }

    const { noteType } = getNoteTypeDisplayNames(registration)

    return h.view('lprns/cancel', {
      pageTitle: localise('lprns:cancel:pageTitle', { noteType }),
      heading: localise('lprns:cancel:heading', { noteType }),
      bodyText: localise('lprns:cancel:bodyText', { noteType }),
      warningText: localise('lprns:cancel:warningText'),
      confirmButton: localise('lprns:cancel:confirmButton'),
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
      basePath,
      prn,
      idToken
    } = await fetchPrnForUpdate(request)

    if (prn.status !== 'awaiting_cancellation') {
      return h.redirect(basePath)
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

      return h.redirect(`${basePath}/${prnId}/cancelled`)
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
