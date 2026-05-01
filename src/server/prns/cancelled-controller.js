import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import {
  buildPrnBasePath,
  fetchPrnContext
} from './helpers/fetch-prn-context.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const cancelledController = {
  /**
   * @param {HapiRequest & { params: PrnDetailParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, registration, prn, basePath } =
      await fetchPrnContext(request)
    const { t: localise } = request
    const redirectBasePath = buildPrnBasePath(request.params)

    if (prn.status !== 'cancelled') {
      return h.redirect(redirectBasePath)
    }

    const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)

    const homeUrl = `/organisations/${organisationId}/registrations/${registrationId}`

    return h.view('prns/cancelled', {
      pageTitle: localise('prns:cancelled:pageTitle', { noteType }),
      heading: localise('prns:cancelled:heading', { noteType }),
      statusLabel: localise('prns:cancelled:statusLabel'),
      statusValue: localise('prns:cancelled:statusValue'),
      whatHappensNextHeading: localise('prns:cancelled:whatHappensNextHeading'),
      wasteBalanceMessage: localise('prns:cancelled:wasteBalanceMessage'),
      prnsPageLink: {
        text: localise('prns:cancelled:prnsPageLink', { noteTypePlural }),
        href: basePath
      },
      returnHomeLink: {
        text: localise('prns:cancelled:returnHomeLink'),
        href: homeUrl
      }
    })
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnDetailParams } from './helpers/session-types.js'
 */
