import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'

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

    const { noteType, noteTypePlural } = getNoteTypeDisplayNames(prnCreated)

    const listUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
    const viewUrl = `${listUrl}/${prnId}/view`
    const createUrl = `${listUrl}/create`
    const homeUrl = `/organisations/${organisationId}`

    return h.view('lprns/created', {
      pageTitle: localise('lprns:create:successPageTitle', { noteType }),
      heading: localise('lprns:create:successHeading', { noteType }),
      statusLabel: localise('lprns:created:statusLabel'),
      statusValue: localise('lprns:created:statusValue'),
      viewButton: {
        text: localise('lprns:created:viewButton', { noteType }),
        href: viewUrl
      },
      nextStepsHeading: localise('lprns:successNextStepsHeading'),
      wasteBalanceMessage: localise('lprns:created:wasteBalanceMessage'),
      issueText: {
        prefix: localise('lprns:created:issueTextPrefix', { noteType }),
        link: {
          text: localise('lprns:created:prnsPageLink', { noteTypePlural }),
          href: listUrl
        },
        suffix: '.'
      },
      createAnotherLink: {
        text: localise('lprns:created:createAnotherLink', { noteType }),
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
