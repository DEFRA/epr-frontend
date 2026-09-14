import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/** @import { WasteBalanceFigure } from './to-waste-balance-table.js' */

/**
 * The UK waste balance aggregate for one reporting year, as the backend
 * returns it. Every figure is already summed by material, accreditation type
 * and month, so nothing here is recomputed on the way to the page.
 * @typedef {{
 *   meta: { generatedAt: string, reportingYear: number },
 *   data: WasteBalanceFigure[]
 * }} WasteBalanceAggregate
 */

/**
 * Fetches the waste balance figures a reporting year is published from.
 * @param {{ year: number, backendToken: string }} query
 * @returns {Promise<WasteBalanceAggregate>}
 */
export const fetchWasteBalance = async ({ year, backendToken }) =>
  /** @type {Promise<WasteBalanceAggregate>} */ (
    fetchJsonFromBackend(
      `/v1/market-insights/waste-balance?year=${encodeURIComponent(year)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  )
