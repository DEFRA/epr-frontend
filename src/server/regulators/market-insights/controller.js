import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime, UK_TIME_ZONE } from '#server/common/helpers/format-time.js'

import { fetchReprocessorExporterFigures } from './helpers/fetch-reprocessor-exporter-figures.js'
import { fetchWasteBalance } from './helpers/fetch-waste-balance.js'
import {
  describeReportingPeriod,
  reportingPeriodNow
} from './helpers/reporting-period.js'
import { toReprocessorExporterTables } from './helpers/to-reprocessor-exporter-tables.js'
import { toWasteBalanceTable } from './helpers/to-waste-balance-table.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 */

/**
 * The market insights preview: the UK waste balance as the published tab lays
 * it out, one row per material and accreditation type with the reporting
 * months across as columns, then the UK reprocessor and exporter figures as
 * theirs are, a table of each for every month.
 *
 * Every figure is served already summed. Grouping them into columns is
 * presentation, and the waste balance row total is the only arithmetic the
 * page does.
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
    const [wasteBalance, figures] = await Promise.all([
      fetchWasteBalance({
        year: period.year,
        month: period.month,
        backendToken
      }),
      fetchReprocessorExporterFigures({
        year: period.year,
        month: period.month,
        backendToken
      })
    ])

    /** @param {string} generatedAt */
    const dataTakenAt = (generatedAt) =>
      localise('regulators:marketInsights:dataTakenAt', {
        date: formatDate(generatedAt, { timeZone: UK_TIME_ZONE }),
        time: formatTime(generatedAt)
      })

    return h.view('regulators/market-insights/index', {
      pageTitle: localise('regulators:marketInsights:pageTitle'),
      heading: localise('regulators:marketInsights:heading'),
      caption: describeReportingPeriod(period, localise),
      description: localise('regulators:marketInsights:description'),
      // Stated beside each set of figures because the publication states it
      // too, so a regulator comparing the two can tell whether they were cut
      // together.
      dataTakenAt: dataTakenAt(wasteBalance.meta.generatedAt),
      wasteBalance: toWasteBalanceTable(
        wasteBalance.data,
        period.months,
        localise
      ),
      figuresTakenAt: dataTakenAt(figures.meta.generatedAt),
      figures: toReprocessorExporterTables(
        figures.data,
        period.months,
        localise
      )
    })
  }
}
