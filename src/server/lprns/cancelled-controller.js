import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const cancelledController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`

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

    if (prn.status !== 'cancelled') {
      return h.redirect(basePath)
    }

    const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)

    const homeUrl = `/organisations/${organisationId}/registrations/${registrationId}`

    return h.view('lprns/cancelled', {
      pageTitle: localise('lprns:cancelled:pageTitle', { noteType }),
      heading: localise('lprns:cancelled:heading', { noteType }),
      statusLabel: localise('lprns:cancelled:statusLabel'),
      statusValue: localise('lprns:cancelled:statusValue'),
      whatHappensNextHeading: localise(
        'lprns:cancelled:whatHappensNextHeading'
      ),
      wasteBalanceMessage: localise('lprns:cancelled:wasteBalanceMessage'),
      prnsPageLink: {
        text: localise('lprns:cancelled:prnsPageLink', { noteTypePlural }),
        href: basePath
      },
      returnHomeLink: {
        text: localise('lprns:cancelled:returnHomeLink'),
        href: homeUrl
      }
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
