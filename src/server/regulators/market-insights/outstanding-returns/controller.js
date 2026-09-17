import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime, UK_TIME_ZONE } from '#server/common/helpers/format-time.js'
import { paths } from '#server/paths.js'

import { fetchOutstandingReturns } from '../helpers/fetch-outstanding-returns.js'
import {
  describeReportingPeriod,
  reportingPeriodNow
} from '../helpers/reporting-period.js'
import { toOutstandingReturnsTables } from '../helpers/to-outstanding-returns-tables.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 */

/**
 * The count of monthly reports owed and not submitted, as the published tab
 * lays it out: a table per material, tonnage bands down and months across.
 *
 * Every count is served already made, so laying them out in columns is all
 * this page does to them. The count masks operators by band, so the page
 * suppresses nothing of its own.
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
    const outstandingReturns = await fetchOutstandingReturns({
      year: period.year,
      month: period.month,
      backendToken
    })

    return h.view('regulators/market-insights/outstanding-returns/index', {
      pageTitle: localise(
        'regulators:marketInsights:outstandingReturns:pageTitle'
      ),
      heading: localise('regulators:marketInsights:outstandingReturns:heading'),
      caption: describeReportingPeriod(period, localise),
      description: localise(
        'regulators:marketInsights:outstandingReturns:description'
      ),
      breadcrumbs: [
        {
          text: localise('regulators:marketInsights:heading'),
          href: request.localiseUrl(paths.regulators.marketInsights)
        },
        {
          text: localise('regulators:marketInsights:outstandingReturns:heading')
        }
      ],
      // Stated beside the figures because the publication states it too, so a
      // regulator comparing the two can tell whether they were cut together.
      dataTakenAt: localise('regulators:marketInsights:dataTakenAt', {
        date: formatDate(outstandingReturns.meta.generatedAt, {
          timeZone: UK_TIME_ZONE
        }),
        time: formatTime(outstandingReturns.meta.generatedAt)
      }),
      outstandingReturns: toOutstandingReturnsTables(
        outstandingReturns.data,
        period.months,
        localise
      )
    })
  }
}
