import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getOrganisationDisplayName } from '#server/common/helpers/waste-organisations/map-to-select-options.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const issuedController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    const [{ registration }, prn, { organisations }] = await Promise.all([
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
      ),
      request.wasteOrganisationsService.getOrganisations()
    ])

    // Only show success page if PRN has been issued (status is awaiting_acceptance)
    if (prn.status !== 'awaiting_acceptance') {
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`
      )
    }

    const recipientDisplayName = getOrganisationDisplayName(
      organisations,
      prn.issuedToOrganisation
    )

    const isExporter = registration.wasteProcessingType === 'exporter'
    const noteType = isExporter ? 'perns' : 'prns'

    const listUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`
    const homeUrl = `/organisations/${organisationId}/registrations/${registrationId}`
    const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`

    return h.view('lprns/issued', {
      pageTitle: localise(`lprns:issued:${noteType}:pageTitle`),
      heading: localise(`lprns:issued:${noteType}:heading`, {
        recipient: recipientDisplayName
      }),
      prnNumberLabel: localise(`lprns:issued:${noteType}:prnNumberLabel`),
      prnNumber: prn.prnNumber,
      wasteBalanceMessage: localise('lprns:issued:wasteBalanceMessage'),
      viewButton: {
        text: localise(`lprns:issued:${noteType}:viewButton`),
        href: viewUrl
      },
      issueAnotherLink: {
        text: localise(`lprns:issued:${noteType}:issueAnotherLink`),
        href: listUrl
      },
      managePrnsLink: {
        text: localise(`lprns:issued:${noteType}:managePrnsLink`),
        href: listUrl
      },
      returnHomeLink: {
        text: localise('lprns:issued:returnHomeLink'),
        href: homeUrl
      }
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
