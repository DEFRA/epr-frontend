import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const discardGetController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

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
      logger: request.logger,
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
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const session = request.auth.credentials

    const createUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/create`

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
