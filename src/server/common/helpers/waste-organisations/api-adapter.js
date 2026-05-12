import { getYear } from 'date-fns'

import { config } from '#config/config.js'
import { loggingEventActions } from '#server/common/enums/event.js'
import { fetchJson } from '../fetch-json.js'

/**
 * @import {TypedLogger} from '#server/common/helpers/logging/logger.js'
 * @import {WasteOrganisationsService} from './port.js'
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
 * @param {TypedLogger} logger
 * @returns {WasteOrganisation[]}
 */
function extractRegistrationTypes(organisations, logger) {
  // TODO: should this use the accreditation year instead of current year?
  const currentYear = getYear(new Date())

  return organisations.map((org) => {
    const { registrations, ...rest } = org

    const producerRegs = registrations?.filter(
      (r) =>
        PRODUCER_TYPES.has(r.type) && Number(r.registrationYear) === currentYear
    )

    if (!producerRegs?.length) {
      logger.warn({
        message:
          'Waste organisation has no producer registration for the current year — display name will fall back to tradingName preference',
        event: {
          action: loggingEventActions.extractRegistrationTypes,
          reason: `organisationId=${org.id} organisationName=${org.name}`
        }
      })
      return rest
    }

    const types = new Set(producerRegs.map((r) => r.type))
    if (types.size > 1) {
      logger.warn({
        message:
          'Waste organisation has both LARGE_PRODUCER and COMPLIANCE_SCHEME registrations for the current year — likely bad data from RPD',
        event: {
          action: loggingEventActions.extractRegistrationTypes,
          reason: `organisationId=${org.id} organisationName=${org.name}`
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
    async getOrganisations() {
      const { url, username, password, key } = config.get(
        'wasteOrganisationsApi'
      )
      const isDevelopment = config.get('isDevelopment')

      // TODO: should this use the accreditation year instead of current year?
      const now = new Date()
      const thisYear = getYear(now)

      const params = new URLSearchParams({
        registrations: ['LARGE_PRODUCER', 'COMPLIANCE_SCHEME'],
        registrationYears: [String(thisYear)],
        statuses: ['REGISTERED']
      })

      const auth = Buffer.from(`${username}:${password}`).toString('base64')

      const response = await fetchJson(`${url}?${params.toString()}`, {
        headers: {
          ...(isDevelopment && { 'x-api-key': key }),
          authorization: `Basic ${auth}`
        }
      })

      return {
        organisations: extractRegistrationTypes(response.organisations, logger)
      }
    }
  }
}
