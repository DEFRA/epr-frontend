import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchPrnContext } from './helpers/fetch-prn-context.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const cancelledController = {
  async handler(request, h) {
    const { organisationId, registrationId, registration, prn, basePath } =
      await fetchPrnContext(request)
    const { t: localise } = request

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
