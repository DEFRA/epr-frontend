import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime, UK_TIME_ZONE } from '#server/common/helpers/format-time.js'
import { paths } from '#server/paths.js'

import { fetchReprocessorExporterFigures } from '../helpers/fetch-reprocessor-exporter-figures.js'
import {
  describeReportingPeriod,
  reportingPeriodNow
} from '../helpers/reporting-period.js'
import { toReprocessorExporterTables } from '../helpers/to-reprocessor-exporter-tables.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 */

/**
 * The UK reprocessor and exporter figures as the published tab lays them out, a
 * reprocessor table and an exporter table for every month of the period.
 *
 * Every figure is served already summed, so laying them out in columns is all
 * this page does to them.
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
    const figures = await fetchReprocessorExporterFigures({
      year: period.year,
      month: period.month,
      backendToken
    })

    return h.view('regulators/market-insights/uk/index', {
      pageTitle: localise('regulators:marketInsights:figures:pageTitle'),
      heading: localise('regulators:marketInsights:figures:heading'),
      caption: describeReportingPeriod(period, localise),
      description: localise('regulators:marketInsights:figures:description'),
      breadcrumbs: [
        {
          text: localise('regulators:marketInsights:heading'),
          href: request.localiseUrl(paths.regulators.marketInsights)
        },
        { text: localise('regulators:marketInsights:figures:heading') }
      ],
      // Stated beside the figures because the publication states it too, so a
      // regulator comparing the two can tell whether they were cut together.
      dataTakenAt: localise('regulators:marketInsights:dataTakenAt', {
        date: formatDate(figures.meta.generatedAt, { timeZone: UK_TIME_ZONE }),
        time: formatTime(figures.meta.generatedAt)
      }),
      figures: toReprocessorExporterTables(
        figures.data,
        period.months,
        localise
      )
    })
  }
}
