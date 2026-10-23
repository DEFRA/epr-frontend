import { errorCodes } from '#server/common/enums/error-codes.js'
import {
  badImplementation,
  classifierTail
} from '#server/common/helpers/logging/cdp-boom.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import {
  fetchPrnContext,
  fetchPrnForUpdate
} from './helpers/fetch-prn-context.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const cancelGetController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { registration, prn, basePath, prnId } =
      await fetchPrnContext(request)
    const { t: localise } = request

    if (prn.status !== 'awaiting_cancellation') {
      return h.redirect(basePath)
    }

    const { noteType } = getNoteTypeDisplayNames(registration)

    await metrics.journey.start(request, JOURNEY.cancelPrn, prnId)

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

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const cancelPostController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { keys, prnId, prn, basePath, backendToken } =
      await fetchPrnForUpdate(request)

    if (prn.status !== 'awaiting_cancellation') {
      return h.redirect(basePath)
    }

    try {
      await updatePrnStatus(keys, prnId, { status: 'cancelled' }, backendToken)

      await metrics.journey.end(request, JOURNEY.cancelPrn, prnId)

      return h.redirect(`${basePath}/${prnId}/cancelled`)
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
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnDetailParams } from './helpers/session-types.js'
 */
