import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/get-note-type.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const discardGetController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    const prnDraft = request.yar.get('prnDraft')

    if (!prnDraft || prnDraft.id !== prnId) {
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/create`
      )
    }

    const { registration } = await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.idToken
    )

    const { noteTypeKey: noteType } = getNoteTypeDisplayNames(registration)

    const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prnId}/view`

    return h.view('lprns/discard', {
      pageTitle: localise(`lprns:discard:${noteType}:pageTitle`),
      heading: localise(`lprns:discard:${noteType}:heading`),
      warningText: localise(`lprns:discard:${noteType}:warningText`),
      confirmButton: localise(`lprns:discard:${noteType}:confirmButton`),
      backUrl: viewUrl
    })
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const discardPostController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const session = request.auth.credentials

    const createUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/create`

    const prnDraft = request.yar.get('prnDraft')

    if (!prnDraft || prnDraft.id !== prnId) {
      return h.redirect(createUrl)
    }

    try {
      await updatePrnStatus(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        { status: 'cancelled' },
        session.idToken
      )

      request.yar.clear('prnDraft')

      return h.redirect(createUrl)
    } catch (error) {
      request.logger.error({ error }, 'Failed to discard PRN')

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation('Failed to discard PRN')
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
