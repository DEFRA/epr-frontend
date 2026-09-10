import { UK_TIME_ZONE } from '#server/common/helpers/format-time.js'

import { fetchWasteBalance } from './helpers/fetch-waste-balance.js'
import { toWasteBalanceTable } from './helpers/to-waste-balance-table.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 */

const ukYear = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  timeZone: UK_TIME_ZONE
})

/**
 * The reporting year the publication is currently accumulating. The page shows
 * the year in progress and offers no other, so the regulator reads the same
 * year the analysts are working in.
 * @returns {number}
 */
const reportingYearNow = () => Number(ukYear.format(new Date()))

/**
 * The market insights preview: the UK waste balance as the published tab lays
 * it out, one row per material and accreditation type with the reporting
 * months across as columns.
 *
 * Every figure is served already summed. Grouping them into columns is
 * presentation, and the row total is the only arithmetic the page does.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  /**
   * @param {HapiRequest} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { backendToken } = request.auth.credentials
    const { t: localise } = request

    const year = reportingYearNow()
    const { data } = await fetchWasteBalance({ year, backendToken })

    return h.view('regulators/market-insights/index', {
      pageTitle: localise('regulators:marketInsights:pageTitle'),
      heading: localise('regulators:marketInsights:heading'),
      caption: localise('regulators:marketInsights:caption', { year }),
      description: localise('regulators:marketInsights:description'),
      wasteBalance: toWasteBalanceTable(data, localise)
    })
  }
}
