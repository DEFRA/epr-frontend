import { backend } from '#server/common/helpers/backend-client.js'
import { toYear } from '#server/common/helpers/year.js'

/** @import { BackendToken } from '#server/common/helpers/backend-token.js' */
/** @import { Year } from '#server/common/helpers/year.js' */

/**
 * The years the backend exports waste records for, newest first.
 * @param {BackendToken} backendToken
 * @returns {Promise<Year[]>}
 */
export const fetchWasteRecordYears = async (backendToken) => {
  /** @type {{ years: { year: number }[] }} */
  const { years } = await backend(backendToken).get('/waste-records/years')

  return years.map(({ year }) => toYear(year))
}
