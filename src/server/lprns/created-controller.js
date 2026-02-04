import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/get-note-type.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const createdController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request

    // Check for success session data
    const prnCreated = request.yar.get('prnCreated')

    if (!prnCreated || prnCreated.id !== prnId) {
      // No session data or ID mismatch - redirect to view page
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${prnId}/view`
      )
    }

    // Clear the session data
    request.yar.clear('prnCreated')

    const { noteTypeKey: noteType } = getNoteTypeDisplayNames(prnCreated)

    return h.view('lprns/created', {
      pageTitle: localise(`lprns:${noteType}:successPageTitle`),
      heading: localise(`lprns:${noteType}:successHeading`),
      tonnageLabel: localise(`lprns:${noteType}:successTonnageLabel`),
      tonnage: prnCreated.tonnage,
      tonnageSuffix: localise('lprns:tonnageSuffix'),
      nextStepsHeading: localise('lprns:successNextStepsHeading'),
      nextStepsText: localise(`lprns:${noteType}:successNextStepsText`),
      returnLink: localise('lprns:successReturnLink'),
      organisationId,
      registrationId,
      accreditationId
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
