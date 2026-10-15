import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { backend, path } from '#server/common/helpers/backend-client.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

/** @import { OnError } from '#server/common/helpers/backend-client.js' */

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
 * @param {Omit<OverseasSitesRequest, 'backendToken'>} params
 * @returns {OnError}
 */
const asMissingRegistration = (params) => (error) => {
  if (Boom.isBoom(error, statusCodes.notFound)) {
    throw registrationNotFound(params)
  }

  throw error
}

/**
 * @param {OverseasSitesRequest} params
 * @returns {Promise<OverseasSitesDetails>}
 */
export const fetchOverseasSites = async (params) => {
  const { organisationNumber, registrationNumber, backendToken } = params

  /** @type {OrganisationView} */
  const organisation = await backend(backendToken).get(
    path`/organisations/${organisationNumber}`,
    { onError: asMissingRegistration(params) }
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
