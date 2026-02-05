import Boom from '@hapi/boom'

import { config } from '#config/config.js'

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
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`
      )
    }

    // Clear the session data
    request.yar.clear('prnCreated')

    const noteType =
      prnCreated.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

    const listUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
    const viewUrl = `${listUrl}/${prnId}/view`
    const createUrl = `${listUrl}/create`
    const homeUrl = `/organisations/${organisationId}`

    return h.view('lprns/created', {
      pageTitle: localise(`lprns:${noteType}:successPageTitle`),
      heading: localise(`lprns:${noteType}:successHeading`),
      prnNumberLabel: localise(`lprns:created:${noteType}:prnNumberLabel`),
      prnNumber: prnCreated.prnNumber,
      statusLabel: localise('lprns:created:statusLabel'),
      statusValue: localise('lprns:created:statusValue'),
      viewButton: {
        text: localise(`lprns:created:${noteType}:viewButton`),
        href: viewUrl
      },
      nextStepsHeading: localise('lprns:successNextStepsHeading'),
      wasteBalanceMessage: localise('lprns:created:wasteBalanceMessage'),
      issueText: {
        prefix: localise(`lprns:created:${noteType}:issueTextPrefix`),
        link: {
          text: localise(`lprns:created:${noteType}:prnsPageLink`),
          href: listUrl
        },
        suffix: '.'
      },
      createAnotherLink: {
        text: localise(`lprns:created:${noteType}:createAnotherLink`),
        href: createUrl
      },
      returnHomeLink: {
        text: localise('lprns:created:returnHomeLink'),
        href: homeUrl
      }
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
