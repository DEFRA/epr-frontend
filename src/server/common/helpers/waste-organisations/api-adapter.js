import { config } from '#config/config.js'
import { loggingEventActions } from '#server/common/enums/event.js'
import { fetchJson } from '../fetch-json.js'
import { WASTE_ORGANISATION_STATUS } from './types.js'

/**
 * @import {TypedLogger} from '#server/common/helpers/logging/logger.js'
 * @import {WasteOrganisationsService} from './port.js'
 * @import {Year} from '#server/common/helpers/year.js'
 * @import {WasteOrganisation, WasteOrganisationStatus, WasteOrganisationType} from './types.js'
 */

/**
 * Raw upstream shape before registrationType extraction — has the wider
 * registrations array that we collapse into registrationType and
 * registrationYears.
 * @typedef {Omit<WasteOrganisation, 'registrationType' | 'registrationYears'> & {
 *   registrations?: Array<{
 *     type: WasteOrganisationType,
 *     registrationYear: number | string,
 *     status: WasteOrganisationStatus
 *   }>
 * }} RawWasteOrganisation
 */

const PRODUCER_TYPES = new Set(['LARGE_PRODUCER', 'COMPLIANCE_SCHEME'])

/**
 * Collapses the raw registrations into the requested years the organisation
 * is registered as a producer for, taking registrationType from the first of
 * them. An organisation registered for none of them cannot be a recipient, so
 * it is left out with a warning.
 * @param {RawWasteOrganisation} organisation
 * @param {Year[]} registrationYears
 * @param {TypedLogger} logger
 * @returns {WasteOrganisation[]}
 */
const toWasteOrganisation = (organisation, registrationYears, logger) => {
  const { registrations = [], ...rest } = organisation

  /** @param {Year} year */
  const producerRegistrationsFor = (year) =>
    registrations.filter(
      (registration) =>
        PRODUCER_TYPES.has(registration.type) &&
        registration.status === WASTE_ORGANISATION_STATUS.registered &&
        Number(registration.registrationYear) === year
    )

  const heldYears = registrationYears.filter(
    (year) => producerRegistrationsFor(year).length > 0
  )
  if (heldYears.length === 0) {
    logger.warn({
      message:
        'Waste organisation has no producer registration for the registration years — leaving it out of the recipients',
      event: {
        action: loggingEventActions.extractRegistrationTypes,
        reason: `organisationId=${organisation.id} organisationName=${organisation.name} registrationYears=${registrationYears.join(',')}`
      }
    })
    return []
  }

  const [firstHeldYear] = heldYears
  const producerRegistrations = producerRegistrationsFor(firstHeldYear)
  const types = new Set(producerRegistrations.map(({ type }) => type))
  if (types.size > 1) {
    logger.warn({
      message:
        'Waste organisation has both LARGE_PRODUCER and COMPLIANCE_SCHEME registrations for the registration year — likely bad data from RPD',
      event: {
        action: loggingEventActions.extractRegistrationTypes,
        reason: `organisationId=${organisation.id} organisationName=${organisation.name} registrationYear=${firstHeldYear}`
      }
    })
  }

  return [
    {
      ...rest,
      registrationType: producerRegistrations[0].type,
      registrationYears: heldYears
    }
  ]
}

/**
 * Creates a waste organisations service that fetches from the real API.
 * @param {TypedLogger} logger
 * @returns {WasteOrganisationsService}
 */
export function createApiWasteOrganisationsService(logger) {
  return {
    async getOrganisations(registrationYears) {
      const { url, username, password, key } = config.get(
        'wasteOrganisationsApi'
      )
      const isDevelopment = config.get('isDevelopment')

      const params = new URLSearchParams({
        registrations: ['LARGE_PRODUCER', 'COMPLIANCE_SCHEME'].join(','),
        registrationYears: registrationYears.join(','),
        statuses: WASTE_ORGANISATION_STATUS.registered
      })

      const auth = Buffer.from(`${username}:${password}`).toString('base64')

      const response = await fetchJson(`${url}?${params.toString()}`, {
        headers: {
          ...(isDevelopment && { 'x-api-key': key }),
          authorization: `Basic ${auth}`
        }
      })

      return {
        organisations: response.organisations.flatMap(
          (/** @type {RawWasteOrganisation} */ organisation) =>
            toWasteOrganisation(organisation, registrationYears, logger)
        )
      }
    }
  }
}
