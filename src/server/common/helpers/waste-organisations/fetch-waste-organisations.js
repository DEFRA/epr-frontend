import { getYear } from 'date-fns'
import { fetchJsonFromBackend } from '../fetch-json-from-backend.js'
import { config } from '#config/config.js'

/** @import {WasteOrganisation} from './types.js' */

/**
 * Fetch waste organisations
 * @returns {Promise<{organisations: WasteOrganisation[]}>}
 */
export async function fetchWasteOrganisations() {
  const { url, username, password, key } = config.get('wasteOrganisationsApi')
  const isDevelopment = config.get('isDevelopment')

  const now = new Date()
  const thisYear = getYear(now)

  const params = new URLSearchParams({
    registrations: ['LARGE_PRODUCER', 'COMPLIANCE_SCHEME'],
    registrationYears: [thisYear],
    statuses: ['REGISTERED']
  })

  const auth = Buffer.from(`${username}:${password}`).toString('base64')

  return fetchJsonFromBackend(`${url}?${params.toString()}`, {
    headers: {
      ...(isDevelopment && { 'x-api-key': key }),
      authorization: `Basic ${auth}`
    }
  })
}
