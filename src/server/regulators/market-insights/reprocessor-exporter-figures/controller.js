import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime, UK_TIME_ZONE } from '#server/common/helpers/format-time.js'
import { paths } from '#server/paths.js'

import { fetchReprocessorExporterFigures } from '../helpers/fetch-reprocessor-exporter-figures.js'
import { offeredPeriod } from '../helpers/offered-period.js'
import { describeReportingPeriod } from '../helpers/reporting-period.js'
import { toReprocessorExporterTables } from '../helpers/to-reprocessor-exporter-tables.js'
import { yearPath } from '../helpers/year-path.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { Nation } from '../helpers/fetch-reprocessor-exporter-figures.js'
 */

/** The figures that name no nation, and read every nation's. */
const UK = 'uk'

/**
 * The reprocessor and exporter figures as the published tab lays them out, a
 * reprocessor table and an exporter table for every month of the period.
 *
 * Every figure is served already summed, so laying them out in columns is all
 * this page does to them. A nation's tab is the same figures narrowed to its
 * regulator, so it is this page with a nation rather than a page of its own.
 * @param {{ nation?: Nation }} [tab] the nation the figures are narrowed to
 * @returns {Partial<HapiServerRoute<HapiRequest>>}
 */
export const reprocessorExporterFiguresController = ({ nation } = {}) => {
  const tabNames = `regulators:marketInsights:figures:${nation ?? UK}`
  // The agreed content words the UK page and the nations' pages differently.
  const wording = nation ? 'nation' : UK
  // The workbook has a tab for England but none for the other nations, so
  // only England's description says its figures are in it.
  const described = nation === 'england' ? nation : wording

  return {
    /**
     * @param {HapiRequest & { params: { year: Year } }} request
     * @param {ResponseToolkit} h
     */
    async handler(request, h) {
      const { backendToken } = request.auth.credentials
      const { t: localise } = request

      const heading = localise(`${tabNames}:heading`)
      const period = offeredPeriod(request)
      const figures = await fetchReprocessorExporterFigures({
        year: period.year,
        month: period.month,
        nation,
        backendToken
      })

      return h.view(
        'regulators/market-insights/reprocessor-exporter-figures/index',
        {
          pageTitle: localise(`${tabNames}:pageTitle`),
          heading,
          caption: describeReportingPeriod(period, localise),
          description: localise(
            `regulators:marketInsights:figures:description:${described}`,
            {
              workbookHref: request.localiseUrl(
                yearPath(paths.regulators.marketInsightsWorkbook, period.year)
              )
            }
          ),
          wording,
          rounding: localise(
            `regulators:marketInsights:figures:calculation:rounding:${wording}`
          ),
          // The UK figures cover every operator, so only a nation has a scope
          // to state.
          scope: nation ? localise(`${tabNames}:scope`) : undefined,
          breadcrumbs: [
            {
              text: localise('regulators:marketInsights:heading'),
              href: request.localiseUrl(
                yearPath(paths.regulators.marketInsightsYear, period.year)
              )
            },
            { text: heading }
          ],
          // Stated beside the figures because the publication states it too, so a
          // regulator comparing the two can tell whether they were cut together.
          dataAggregatedAt: localise(
            'regulators:marketInsights:figures:dataAggregatedAt',
            {
              date: formatDate(figures.meta.generatedAt, {
                timeZone: UK_TIME_ZONE
              }),
              time: formatTime(figures.meta.generatedAt)
            }
          ),
          figures: toReprocessorExporterTables(
            figures.data,
            period.months,
            localise
          )
        }
      )
    }
  }
}
