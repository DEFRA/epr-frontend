import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

/**
 * @typedef {{
 *   name: string,
 *   address: {
 *     country: string,
 *     line1: string,
 *     line2?: string,
 *     townOrCity: string,
 *     stateOrRegion?: string,
 *     postcode?: string
 *   },
 *   coordinates?: string
 * }} OverseasSiteView
 */

/**
 * @typedef {Record<string, OverseasSiteView>} OverseasSitesByOrsId
 * @typedef {{
 *   material: string,
 *   overseasSites?: OverseasSitesByOrsId
 * }} RegistrationView
 * @typedef {{
 *   name: string,
 *   tradingName?: string,
 *   organisationNumber: number,
 *   registrations: Record<string, RegistrationView>
 * }} OrganisationView
 * @typedef {{
 *   organisation: OrganisationView,
 *   registrationNumber: string,
 *   registration: RegistrationView
 * }} OverseasSitesDetails
 * @typedef {{
 *   organisationNumber: string,
 *   registrationNumber: string,
 *   backendToken: string
 * }} OverseasSitesRequest
 */

/**
 * @param {Omit<OverseasSitesRequest, 'backendToken'>} params
 */
const registrationNotFound = ({ organisationNumber, registrationNumber }) =>
  notFound('Registration not found', errorCodes.registrationNotFound, {
    event: {
      action: 'fetch_overseas_sites',
      reason: `organisationNumber=${organisationNumber} registrationNumber=${registrationNumber}`
    }
  })

/**
 * @param {OverseasSitesRequest} params
 * @returns {Promise<OverseasSitesDetails>}
 */
export const fetchOverseasSites = async (params) => {
  const { organisationNumber, registrationNumber, backendToken } = params

  const organisation = /** @type {OrganisationView} */ (
    await fetchJsonFromBackend(
      `/organisations/${encodeURIComponent(organisationNumber)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${backendToken}` }
      }
    ).catch((error) => {
      if (Boom.isBoom(error, statusCodes.notFound)) {
        throw registrationNotFound(params)
      }

      throw error
    })
  )

  if (!Object.hasOwn(organisation.registrations, registrationNumber)) {
    throw registrationNotFound(params)
  }

  return {
    organisation,
    registrationNumber,
    registration: organisation.registrations[registrationNumber]
  }
}
