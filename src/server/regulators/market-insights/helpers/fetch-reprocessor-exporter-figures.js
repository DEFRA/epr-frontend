import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/** @import { ReprocessorExporterData } from './to-reprocessor-exporter-tables.js' */

/**
 * The UK reprocessor and exporter figures for a reporting period, as the
 * backend returns them. Every figure is already summed by material,
 * accreditation type and month, and the average price already divided, so
 * nothing here is recomputed on the way to the page.
 * @typedef {{
 *   meta: { generatedAt: string },
 *   data: ReprocessorExporterData
 * }} ReprocessorExporterAggregate
 */

/**
 * Fetches the reprocessor and exporter figures from January through a
 * reporting month. The backend rejects a month that has not ended, so the
 * page can only ask for complete ones.
 * @param {{ year: number, month: number, backendToken: string }} period
 * @returns {Promise<ReprocessorExporterAggregate>}
 */
export const fetchReprocessorExporterFigures = async ({
  year,
  month,
  backendToken
}) =>
  /** @type {Promise<ReprocessorExporterAggregate>} */ (
    fetchJsonFromBackend(
      `/v1/market-insights/${year}/monthly/${month}/reprocessor-exporter-figures`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  )
