import { errorCodes } from '#server/common/enums/error-codes.js'
import {
  badImplementation,
  classifierTail
} from '#server/common/helpers/logging/cdp-boom.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import {
  buildPrnBasePath,
  fetchPrnContext,
  fetchPrnForUpdate
} from './helpers/fetch-prn-context.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

export const cancelGetController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
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

export const cancelPostController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
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
      if (error.isBoom) {
        throw error
      }

      throw badImplementation(
        'Failed to cancel PRN',
        errorCodes.prnCancelFailed,
        {
          event: {
            action: 'cancel_prn',
            reason: classifierTail(error)
          }
        }
      )
    }
  }
}

/**
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PrnDetailParams } from './helpers/session-types.js'
 */
