import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { fetchOrganisationYears } from '#server/common/helpers/organisations/fetch-organisation-years.js'
import { homePath, renderHome } from './home-page.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { OrganisationParams } from './index.js'
 */

/**
 * The organisation's home page with no year in the address. Operators are
 * sent to their latest year, or shown an organisation with no active year its
 * empty page.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const homeController = {
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const orgNumber = organisationNumber(
      Number(request.params.organisationNumber)
    )
    const { backendToken } = request.auth.credentials

    const [latestYear] = await fetchOrganisationYears(orgNumber, backendToken)

    if (latestYear) {
      return h.redirect(
        request.localiseUrl(
          homePath(orgNumber, {
            year: latestYear,
            exporting: request.path.endsWith('/exporting')
          })
        )
      )
    }

    return renderHome(request, h, {
      orgNumber,
      organisation: await fetchOrganisation(orgNumber, backendToken),
      displayedRegistrations: [],
      wasteBalanceMap: {},
      year: null
    })
  }
}
