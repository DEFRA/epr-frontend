import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { isAccreditationViewActive } from '#server/common/helpers/organisations/accreditation-helpers.js'
import { fetchOrganisation } from '#server/common/helpers/organisations/fetch-organisation.js'
import { fetchOrganisationYears } from '#server/common/helpers/organisations/fetch-organisation-years.js'
import { fetchOrganisationWasteBalances } from '#server/common/helpers/waste-balance/fetch-organisation-waste-balances.js'
import { year as toYear } from '#server/common/helpers/year.js'
import Boom from '@hapi/boom'
import { renderHome } from './home-page.js'

/** @import { TypedLogger } from '#server/common/helpers/logging/logger.js' */

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js'
 * @import { RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { WasteBalanceMap } from '#server/common/helpers/waste-balance/types.js'
 * @import { DisplayedRegistration } from './home-page.js'
 * @import { OrganisationParams } from './index.js'
 */

/**
 * @param {string} segment
 * @returns {Year}
 */
const yearOf = (segment) => {
  if (!/^\d{4}$/.test(segment)) {
    throw Boom.notFound()
  }

  return toYear(Number(segment))
}

/**
 * Each registration with the year's accreditation, if it is live
 * @param {Record<string, RegistrationView>} registrations
 * @param {Year} selectedYear
 * @returns {DisplayedRegistration[]}
 */
function getDisplayedRegistrations(registrations, selectedYear) {
  return Object.entries(registrations).map(([number, registration]) => {
    const accreditation = registration.accreditations[selectedYear]
    return {
      number,
      registration,
      accreditation: isAccreditationViewActive(accreditation)
        ? accreditation
        : undefined
    }
  })
}

/**
 * Fetches the year's waste balances. A failure leaves the page without them.
 * @param {OrganisationNumber} orgNumber
 * @param {Year} selectedYear
 * @param {string} backendToken - JWT token
 * @param {TypedLogger} logger - Request logger
 * @returns {Promise<WasteBalanceMap>}
 */
async function getWasteBalanceMap(
  orgNumber,
  selectedYear,
  backendToken,
  logger
) {
  try {
    return await fetchOrganisationWasteBalances(
      orgNumber,
      selectedYear,
      backendToken
    )
  } catch (error) {
    logger.error({ message: 'Failed to fetch waste balances', err: error })
    return {}
  }
}

/**
 * The organisation's home page for one of its approved years.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const yearController = {
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    if (readsAsARegulator(request.auth.credentials)) {
      throw Boom.notFound()
    }

    const orgNumber = organisationNumber(
      Number(request.params.organisationNumber)
    )
    const { backendToken } = request.auth.credentials
    const year = yearOf(String(request.params.year))

    const years = await fetchOrganisationYears(orgNumber, backendToken)

    if (!years.includes(year)) {
      throw Boom.notFound()
    }

    const [organisation, wasteBalanceMap] = await Promise.all([
      fetchOrganisation(orgNumber, backendToken, { year }),
      getWasteBalanceMap(orgNumber, year, backendToken, request.logger)
    ])

    return renderHome(request, h, {
      orgNumber,
      organisation,
      displayedRegistrations: getDisplayedRegistrations(
        organisation.registrations,
        year
      ),
      wasteBalanceMap,
      year
    })
  }
}
