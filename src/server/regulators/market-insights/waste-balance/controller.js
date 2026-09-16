import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime, UK_TIME_ZONE } from '#server/common/helpers/format-time.js'
import { paths } from '#server/paths.js'

import { fetchWasteBalance } from '../helpers/fetch-waste-balance.js'
import {
  describeReportingPeriod,
  reportingPeriodNow
} from '../helpers/reporting-period.js'
import { toWasteBalanceTable } from '../helpers/to-waste-balance-table.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 */

/**
 * The UK waste balance as the published tab lays it out, one row per material
 * and accreditation type with the reporting months across as columns.
 *
 * Every figure is served already summed, so grouping them into columns is
 * presentation and the row total is the only arithmetic the page does.
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
    const wasteBalance = await fetchWasteBalance({
      year: period.year,
      month: period.month,
      backendToken
    })

    return h.view('regulators/market-insights/waste-balance/index', {
      pageTitle: localise('regulators:marketInsights:wasteBalance:pageTitle'),
      heading: localise('regulators:marketInsights:wasteBalance:heading'),
      caption: describeReportingPeriod(period, localise),
      description: localise(
        'regulators:marketInsights:wasteBalance:description'
      ),
      breadcrumbs: [
        {
          text: localise('regulators:marketInsights:heading'),
          href: request.localiseUrl(paths.regulators.marketInsights)
        },
        { text: localise('regulators:marketInsights:wasteBalance:heading') }
      ],
      // Stated beside the figures because the publication states it too, so a
      // regulator comparing the two can tell whether they were cut together.
      dataTakenAt: localise('regulators:marketInsights:dataTakenAt', {
        date: formatDate(wasteBalance.meta.generatedAt, {
          timeZone: UK_TIME_ZONE
        }),
        time: formatTime(wasteBalance.meta.generatedAt)
      }),
      wasteBalance: toWasteBalanceTable(
        wasteBalance.data,
        period.months,
        localise
      )
    })
  }
}
