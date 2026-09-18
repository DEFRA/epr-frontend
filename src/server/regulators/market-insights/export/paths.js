/**
 * The pages one export is addressed by. An export is named by the reporting
 * period it covers, exactly as the backend names it, so these carry segments
 * and cannot sit with the fixed addresses in `#server/paths.js`.
 */

/**
 * @typedef {{
 *   year: string | number,
 *   cadence: string,
 *   period: string | number
 * }} ExportPeriod
 */

export const marketInsightsExportPath =
  '/regulators/market-insights/exports/{year}/{cadence}/{period}'

export const marketInsightsExportDownloadPath =
  '/regulators/market-insights/exports/{year}/{cadence}/{period}/download'

/**
 * Segments go straight into an href, so each is encoded.
 * @param {ExportPeriod} period
 * @returns {string}
 */
export const buildMarketInsightsExportPath = ({ year, cadence, period }) =>
  ['regulators', 'market-insights', 'exports', year, cadence, period]
    .map((segment) => `/${encodeURIComponent(segment)}`)
    .join('')

/**
 * @param {ExportPeriod} period
 * @returns {string}
 */
export const buildMarketInsightsExportDownloadPath = (period) =>
  `${buildMarketInsightsExportPath(period)}/download`

/**
 * Names the build an address is about. A completed export is never reused, so
 * an address that names no build asks for a new one - which is what a poll or
 * a download must never do.
 * @param {string} path
 * @param {string} buildToken
 * @returns {string}
 */
export const forBuild = (path, buildToken) =>
  `${path}?build=${encodeURIComponent(buildToken)}`
