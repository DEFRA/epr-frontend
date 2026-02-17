import Boom from '@hapi/boom'

import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import {
  buildPrnBasePath,
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
    const redirectBasePath = buildPrnBasePath(request.params)

    if (prn.status !== 'awaiting_cancellation') {
      return h.redirect(redirectBasePath)
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
    const redirectBasePath = buildPrnBasePath(request.params)

    if (prn.status !== 'awaiting_cancellation') {
      return h.redirect(redirectBasePath)
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

      return h.redirect(
        `/organisations/${orgId}/registrations/${regId}/accreditations/${accId}/packaging-recycling-notes/${noteId}/cancelled`
      )
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
