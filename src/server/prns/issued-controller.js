import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { getDisplayName } from '#server/common/helpers/waste-organisations/get-display-name.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const issuedController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    // Read and clear session data stored by issue controller.
    // This mitigates a MongoDB replication lag race condition where the
    // freshly-issued prnNumber may not yet be available via the fetch below.
    const prnIssued = request.yar.get('prnIssued')
    if (prnIssued) {
      request.yar.clear('prnIssued')
    }

    const [{ registration }, prn] = await Promise.all([
      fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      ),
      fetchPackagingRecyclingNote(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        session.idToken
      )
    ])

    // Only show success page if PRN has been issued (status is awaiting_acceptance)
    if (prn.status !== 'awaiting_acceptance') {
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`
      )
    }

    const recipientDisplayName = getDisplayName(prn.issuedToOrganisation)
    const prnNumber =
      prn.prnNumber || (prnIssued?.id === prnId && prnIssued?.prnNumber) || null

    const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)

    const listUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
    const homeUrl = `/organisations/${organisationId}/registrations/${registrationId}`
    const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`

    return h.view('prns/issued', {
      pageTitle: localise('prns:issued:pageTitle', { noteType }),
      heading: localise('prns:issued:heading', {
        noteType,
        recipient: recipientDisplayName
      }),
      prnNumberLabel: localise('prns:issued:prnNumberLabel', { noteType }),
      prnNumber,
      wasteBalanceMessage: localise('prns:issued:wasteBalanceMessage'),
      viewButton: {
        text: localise('prns:issued:viewButton', { noteType }),
        href: viewUrl
      },
      issueAnotherLink: {
        text: localise('prns:issued:issueAnotherLink', { noteType }),
        href: listUrl
      },
      managePrnsLink: {
        text: localise('prns:issued:managePrnsLink', { noteTypePlural }),
        href: listUrl
      },
      returnHomeLink: {
        text: localise('prns:issued:returnHomeLink'),
        href: homeUrl
      }
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
