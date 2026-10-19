import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { getIssuedToOrgDisplayName } from '#server/common/helpers/waste-organisations/get-issued-to-org-display-name.js'
import { fetchPrnContext } from './helpers/fetch-prn-context.js'
import { accreditationPath } from '#server/reports/helpers/report-paths.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const issuedController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { t: localise } = request

    // Read and clear session data stored by issue controller.
    // This mitigates a MongoDB replication lag race condition where the
    // freshly-issued prnNumber may not yet be available via the fetch below.
    /** @type {PrnIssuedSession | null} */
    const prnIssued = request.yar.get('prnIssued')
    if (prnIssued) {
      request.yar.clear('prnIssued')
    }

    const { keys, registration, prn, basePath, prnId } =
      await fetchPrnContext(request)
    const viewUrl = `${basePath}/${prnId}/view`

    // Only show success page if PRN has been issued (status is awaiting_acceptance)
    if (prn.status !== 'awaiting_acceptance') {
      return h.redirect(viewUrl)
    }

    const recipientDisplayName = getIssuedToOrgDisplayName(
      prn.issuedToOrganisation
    )
    const prnNumber =
      prn.prnNumber || (prnIssued?.id === prnId && prnIssued?.prnNumber) || null

    const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)

    return h.view('prns/issued', {
      pageTitle: localise('prns:issued:pageTitle', { noteType }),
      heading: localise('prns:issued:heading', {
        noteType,
        recipient: recipientDisplayName
      }),
      prnNumberLabel: localise('prns:issued:prnNumberLabel', { noteType }),
      prnNumber,
      wasteBalanceMessage: localise('prns:issued:wasteBalanceMessage'),
      whatHappensNextHeading: localise('prns:issued:whatHappensNextHeading'),
      viewButton: {
        text: localise('prns:issued:viewButton', { noteType }),
        href: viewUrl
      },
      issueAnotherLink: {
        text: localise('prns:issued:issueAnotherLink', { noteType }),
        href: basePath
      },
      managePrnsLink: {
        text: localise('prns:issued:managePrnsLink', { noteTypePlural }),
        href: basePath
      },
      returnHomeLink: {
        text: localise('prns:issued:returnHomeLink'),
        href: accreditationPath(keys)
      }
    })
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnDetailParams, PrnIssuedSession } from './helpers/session-types.js'
 */
