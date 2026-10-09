import { backend } from '#server/common/helpers/backend-client.js'

/** @import { WasteBalanceData } from './to-waste-balance-table.js' */

/**
 * The UK waste balance aggregate for a reporting period, as the backend
 * returns it. Every figure is already summed by material, accreditation type
 * and month, so nothing here is recomputed on the way to the page.
 * @typedef {{
 *   meta: { generatedAt: string },
 *   data: WasteBalanceData
 * }} WasteBalanceAggregate
 */

/**
 * Fetches the waste balance figures from January through a reporting month.
 * The backend rejects a month that has not ended, so the page can only ask for
 * complete ones.
 * @param {{ year: number, month: number, backendToken: string }} period
 * @returns {Promise<WasteBalanceAggregate>}
 */
export const fetchWasteBalance = async ({ year, month, backendToken }) =>
  backend(backendToken).get(
    `/v1/market-insights/${year}/monthly/${month}/waste-balance`
  )
