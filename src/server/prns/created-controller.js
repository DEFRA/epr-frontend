import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const createdController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request

    // Check for success session data
    /** @type {PrnCreatedSession | null} */
    const prnCreated = request.yar.get('prnCreated')

    if (prnCreated?.id !== prnId) {
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

    return h.view('prns/created', {
      pageTitle: localise('prns:create:successPageTitle', { noteType }),
      heading: localise('prns:create:successHeading', { noteType }),
      prnNumberLabel: localise('prns:created:prnNumberLabel', { noteType }),
      prnNumber: prnCreated.prnNumber,
      statusLabel: localise('prns:created:statusLabel'),
      statusValue: localise('prns:created:statusValue'),
      viewButton: {
        text: localise('prns:created:viewButton', { noteType }),
        href: viewUrl
      },
      nextStepsHeading: localise('prns:successNextStepsHeading'),
      wasteBalanceMessage: localise('prns:created:wasteBalanceMessage'),
      issueText: {
        prefix: localise('prns:created:issueTextPrefix', { noteType }),
        link: {
          text: localise('prns:created:prnsPageLink', { noteTypePlural }),
          href: listUrl
        },
        suffix: '.'
      },
      createAnotherLink: {
        text: localise('prns:created:createAnotherLink', { noteType }),
        href: createUrl
      },
      returnHomeLink: {
        text: localise('prns:created:returnHomeLink'),
        href: homeUrl
      }
    })
  }
}

/**
 * @import { ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PrnCreatedSession, PrnDetailParams } from './helpers/session-types.js'
 */
