import { config } from '#config/config.js'
import { loggingEventActions } from '#server/common/enums/event.js'
import { fetchJson } from '../fetch-json.js'

/**
 * @import {TypedLogger} from '#server/common/helpers/logging/logger.js'
 * @import {WasteOrganisationsService} from './port.js'
 * @import {Year} from '#server/common/helpers/year.js'
 * @import {WasteOrganisation, WasteOrganisationType} from './types.js'
 */

/**
 * Raw upstream shape before registrationType extraction — has the wider
 * registrations array that we collapse into a single registrationType.
 * @typedef {Omit<WasteOrganisation, 'registrationType'> & {
 *   registrations?: Array<{ type: WasteOrganisationType, registrationYear: number | string }>
 * }} RawWasteOrganisation
 */

const PRODUCER_TYPES = new Set(['LARGE_PRODUCER', 'COMPLIANCE_SCHEME'])

/**
 * Extracts registrationType from the raw registrations array and warns
 * on missing or ambiguous producer registrations.
 * @param {RawWasteOrganisation[]} organisations
 * @param {Year} registrationYear
 * @param {TypedLogger} logger
 * @returns {WasteOrganisation[]}
 */
function extractRegistrationTypes(organisations, registrationYear, logger) {
  return organisations.map((org) => {
    const { registrations, ...rest } = org

    const producerRegs = registrations?.filter(
      (r) =>
        PRODUCER_TYPES.has(r.type) &&
        Number(r.registrationYear) === registrationYear
    )

    if (!producerRegs?.length) {
      logger.warn({
        message:
          'Waste organisation has no producer registration for the registration year — display name will fall back to tradingName preference',
        event: {
          action: loggingEventActions.extractRegistrationTypes,
          reason: `organisationId=${org.id} organisationName=${org.name} registrationYear=${registrationYear}`
        }
      })
      return rest
    }

    const types = new Set(producerRegs.map((r) => r.type))
    if (types.size > 1) {
      logger.warn({
        message:
          'Waste organisation has both LARGE_PRODUCER and COMPLIANCE_SCHEME registrations for the registration year — likely bad data from RPD',
        event: {
          action: loggingEventActions.extractRegistrationTypes,
          reason: `organisationId=${org.id} organisationName=${org.name} registrationYear=${registrationYear}`
        }
      })
    }

    return { ...rest, registrationType: producerRegs[0].type }
  })
}

/**
 * Creates a waste organisations service that fetches from the real API.
 * @param {TypedLogger} logger
 * @returns {WasteOrganisationsService}
 */
export function createApiWasteOrganisationsService(logger) {
  return {
    async getOrganisations(registrationYear) {
      const { url, username, password, key } = config.get(
        'wasteOrganisationsApi'
      )
      const isDevelopment = config.get('isDevelopment')

      const params = new URLSearchParams({
        registrations: ['LARGE_PRODUCER', 'COMPLIANCE_SCHEME'].join(','),
        registrationYears: String(registrationYear),
        statuses: 'REGISTERED'
      })

      const auth = Buffer.from(`${username}:${password}`).toString('base64')

      const response = await fetchJson(`${url}?${params.toString()}`, {
        headers: {
          ...(isDevelopment && { 'x-api-key': key }),
          authorization: `Basic ${auth}`
        }
      })

      return {
        organisations: extractRegistrationTypes(
          response.organisations,
          registrationYear,
          logger
        )
      }
    }
  }
}
