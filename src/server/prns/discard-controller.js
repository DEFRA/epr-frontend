import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import {
  badImplementation,
  classifierTail
} from '#server/common/helpers/logging/cdp-boom.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const discardGetController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    /** @type {PrnDraftSession | null} */
    const prnDraft = request.yar.get('prnDraft')

    if (prnDraft?.id !== prnId) {
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create`
      )
    }

    const { registration } = await getRequiredRegistrationWithAccreditation({
      organisationId,
      registrationId,
      idToken: session.idToken,
      accreditationId
    })

    const { noteType } = getNoteTypeDisplayNames(registration)

    const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`

    return h.view('prns/discard', {
      pageTitle: localise('prns:discard:pageTitle', { noteType }),
      heading: localise('prns:discard:heading', { noteType }),
      warningText: localise('prns:discard:warningText', { noteType }),
      confirmButton: localise('prns:discard:confirmButton'),
      backUrl: viewUrl
    })
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const discardPostController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const session = request.auth.credentials

    const createUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create`

    /** @type {PrnDraftSession | null} */
    const prnDraft = request.yar.get('prnDraft')

    if (prnDraft?.id !== prnId) {
      return h.redirect(createUrl)
    }

    try {
      await updatePrnStatus(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        { status: 'discarded' },
        session.idToken
      )

      request.yar.clear('prnDraft')

      return h.redirect(createUrl)
    } catch (error) {
      request.logger.error({ message: 'Failed to discard PRN', err: error })

      if (error.isBoom) {
        throw error
      }

      throw badImplementation(
        'Failed to discard PRN',
        errorCodes.prnDiscardFailed,
        {
          event: {
            action: 'discard_prn',
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
 * @import { PrnDetailParams, PrnDraftSession } from './helpers/session-types.js'
 */
