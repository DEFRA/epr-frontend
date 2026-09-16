import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/** @import { OutstandingReturnsData } from './to-outstanding-returns-tables.js' */

/**
 * The count of outstanding monthly reports for a reporting period, as the
 * backend returns it. Every material and tonnage band is served for every
 * month, at zero where nothing is outstanding.
 * @typedef {{
 *   meta: { generatedAt: string },
 *   data: OutstandingReturnsData
 * }} OutstandingReturnsAggregate
 */

/**
 * Fetches the outstanding reports count from January through a reporting
 * month. The backend rejects a month that has not ended, so the page can only
 * ask for complete ones.
 * @param {{ year: number, month: number, backendToken: string }} period
 * @returns {Promise<OutstandingReturnsAggregate>}
 */
export const fetchOutstandingReturns = async ({ year, month, backendToken }) =>
  /** @type {Promise<OutstandingReturnsAggregate>} */ (
    fetchJsonFromBackend(
      `/v1/market-insights/${year}/monthly/${month}/outstanding-returns`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  )
