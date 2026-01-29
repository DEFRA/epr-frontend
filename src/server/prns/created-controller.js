import Boom from '@hapi/boom'

import { config } from '#config/config.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const createdController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, prnId } = request.params
    const { t: localise } = request

    // Check for success session data
    const prnCreated = request.yar.get('prnCreated')

    if (!prnCreated || prnCreated.id !== prnId) {
      // No session data or ID mismatch - redirect to view page
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes/${prnId}/view`
      )
    }

    // Clear the session data
    request.yar.clear('prnCreated')

    const noteType =
      prnCreated.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

    return h.view('prns/created', {
      pageTitle: localise(`prns:${noteType}:successPageTitle`),
      heading: localise(`prns:${noteType}:successHeading`),
      tonnageLabel: localise(`prns:${noteType}:successTonnageLabel`),
      tonnage: prnCreated.tonnage,
      tonnageSuffix: localise('prns:tonnageSuffix'),
      nextStepsHeading: localise('prns:successNextStepsHeading'),
      nextStepsText: localise(`prns:${noteType}:successNextStepsText`),
      returnLink: localise('prns:successReturnLink'),
      organisationId,
      registrationId
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
