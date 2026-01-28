import Boom from '@hapi/boom'

import { config } from '#config/config.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const successController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId } = request.params
    const { t: localise } = request

    // Retrieve PRN data from session
    const prnCreated = request.yar.get('prnCreated')

    if (!prnCreated) {
      // No PRN in session - redirect to create page
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/create-prn`
      )
    }

    // Clear the session data
    request.yar.clear('prnCreated')

    const noteType =
      prnCreated.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

    return h.view('prns/success', {
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
