import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import {
  badImplementation,
  classifierTail
} from '#server/common/helpers/logging/cdp-boom.js'
import {
  buildPrnBasePath,
  fetchPrnContext,
  fetchPrnForUpdate
} from './helpers/fetch-prn-context.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

export const deleteGetController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { registration, prn, basePath, prnId } =
      await fetchPrnContext(request)
    const { t: localise } = request
    const redirectBasePath = buildPrnBasePath(request.params)

    if (prn.status !== 'awaiting_authorisation') {
      return h.redirect(redirectBasePath)
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

export const deletePostController = {
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
    const redirectBasePath = buildPrnBasePath(request.params)

    if (prn.status !== 'awaiting_authorisation') {
      return h.redirect(redirectBasePath)
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

      return h.redirect(redirectBasePath)
    } catch (error) {
      if (error.isBoom) {
        throw error
      }

      throw badImplementation(
        'Failed to delete PRN',
        errorCodes.prnDeleteFailed,
        {
          event: {
            action: 'delete_prn',
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
