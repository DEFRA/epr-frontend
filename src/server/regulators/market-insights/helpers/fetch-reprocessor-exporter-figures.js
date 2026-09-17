import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/** @import { ReprocessorExporterData } from './to-reprocessor-exporter-tables.js' */

/**
 * The reprocessor and exporter figures for a reporting period, as the backend
 * returns them. Every figure is already summed by material, accreditation type
 * and month, and the average price already divided, so nothing here is
 * recomputed on the way to the page.
 * @typedef {{
 *   meta: { generatedAt: string },
 *   data: ReprocessorExporterData
 * }} ReprocessorExporterAggregate
 */

/**
 * A nation the figures can be narrowed to, spelled the way the backend takes
 * it in a path.
 * @typedef {'england' | 'northern-ireland' | 'scotland' | 'wales'} Nation
 */

/**
 * Fetches the reprocessor and exporter figures from January through a
 * reporting month. The backend rejects a month that has not ended, so the
 * page can only ask for complete ones.
 *
 * A nation is served as a sibling resource of the UK figures.
 * @param {{
 *   year: number,
 *   month: number,
 *   nation?: Nation,
 *   backendToken: string
 * }} period
 * @returns {Promise<ReprocessorExporterAggregate>}
 */
export const fetchReprocessorExporterFigures = async ({
  year,
  month,
  nation,
  backendToken
}) =>
  /** @type {Promise<ReprocessorExporterAggregate>} */ (
    fetchJsonFromBackend(
      `/v1/market-insights/${year}/monthly/${month}/reprocessor-exporter-figures${nation === undefined ? '' : `/${nation}`}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${backendToken}`
        }
      }
    )
  )
