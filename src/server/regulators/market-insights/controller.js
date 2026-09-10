import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime, UK_TIME_ZONE } from '#server/common/helpers/format-time.js'

import { fetchWasteBalance } from './helpers/fetch-waste-balance.js'
import {
  describeReportingPeriod,
  reportingPeriodNow
} from './helpers/reporting-period.js'
import { toWasteBalanceTable } from './helpers/to-waste-balance-table.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 */

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

    const period = reportingPeriodNow()
    const { meta, data } = await fetchWasteBalance({
      year: period.year,
      backendToken
    })

    return h.view('regulators/market-insights/index', {
      pageTitle: localise('regulators:marketInsights:pageTitle'),
      heading: localise('regulators:marketInsights:heading'),
      caption: describeReportingPeriod(period, localise),
      description: localise('regulators:marketInsights:description'),
      // Stated beside the figures because the publication states it too, so a
      // regulator comparing the two can tell whether they were cut together.
      dataTakenAt: localise('regulators:marketInsights:dataTakenAt', {
        date: formatDate(meta.generatedAt, { timeZone: UK_TIME_ZONE }),
        time: formatTime(meta.generatedAt)
      }),
      wasteBalance: toWasteBalanceTable(data, period.months, localise)
    })
  }
}
