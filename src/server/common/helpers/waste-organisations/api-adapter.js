/** @import {WasteOrganisationsService} from './port.js' */

import { getYear } from 'date-fns'

import { config } from '#config/config.js'
import { fetchJson } from '../fetch-json.js'

/**
 * Creates a waste organisations service that fetches from the real API.
 * @returns {WasteOrganisationsService}
 */
export function createApiWasteOrganisationsService() {
  return {
    async getOrganisations() {
      const { url, username, password, key } = config.get(
        'wasteOrganisationsApi'
      )
      const isDevelopment = config.get('isDevelopment')

      const now = new Date()
      const thisYear = getYear(now)

      const params = new URLSearchParams({
        registrations: ['LARGE_PRODUCER', 'COMPLIANCE_SCHEME'],
        registrationYears: [thisYear],
        statuses: ['REGISTERED']
      })

      const auth = Buffer.from(`${username}:${password}`).toString('base64')

      return fetchJson(`${url}?${params.toString()}`, {
        headers: {
          ...(isDevelopment && { 'x-api-key': key }),
          authorization: `Basic ${auth}`
        }
      })
    }
  }
}
