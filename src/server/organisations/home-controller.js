import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { fetchOrganisationYears } from '#server/common/helpers/organisations/fetch-organisation-years.js'
import { currentYear } from '#server/common/helpers/year.js'
import { homePath, renderHome } from './home-page.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { OrganisationParams } from './index.js'
 */

/**
 * The organisation's home page with no year in the address. Operators are
 * sent to the current year, else their latest, or shown an organisation with
 * no active year its empty page.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const homeController = {
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const orgNumber = request.params.organisationNumber
    const { backendToken } = request.auth.credentials

    const years = await fetchOrganisationYears(orgNumber, backendToken)
    const [latestYear] = years
    const year = years.includes(currentYear()) ? currentYear() : latestYear

    if (year) {
      return h.redirect(
        request.localiseUrl(
          homePath(orgNumber, {
            year,
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
