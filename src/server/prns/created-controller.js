import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { organisationPath } from '#server/reports/helpers/report-paths.js'
import { toAccreditationKeys } from './helpers/fetch-prn-context.js'
import { prnsPath } from './helpers/prn-resource.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const createdController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const keys = toAccreditationKeys(request.params)
    const { prnId } = request.params
    const { t: localise } = request

    const listUrl = prnsPath(keys)
    const viewUrl = `${listUrl}/${prnId}/view`

    // Check for success session data
    /** @type {PrnCreatedSession | null} */
    const prnCreated = request.yar.get('prnCreated')

    if (prnCreated?.id !== prnId) {
      // No session data or ID mismatch - redirect to view page
      return h.redirect(viewUrl)
    }

    // Clear the session data
    request.yar.clear('prnCreated')

    const { noteType, noteTypePlural } = getNoteTypeDisplayNames(prnCreated)

    const createUrl = `${listUrl}/create`
    const homeUrl = organisationPath(keys)

    const headingKey = prnCreated.isDecemberWaste
      ? 'prns:create:successHeadingDecemberWaste'
      : 'prns:create:successHeading'

    return h.view('prns/created', {
      pageTitle: localise('prns:create:successPageTitle', { noteType }),
      heading: localise(headingKey, { noteType }),
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
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnCreatedSession, PrnDetailParams } from './helpers/session-types.js'
 */
