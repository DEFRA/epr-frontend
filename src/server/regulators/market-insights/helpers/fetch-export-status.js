import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

import { forBuild } from '../export/paths.js'

/** @import { ExportPeriod } from '../export/paths.js' */

/**
 * Where a build of a reporting period's export has got to. A build names
 * itself while it runs; the zip's address and expiry arrive once it is done,
 * and a reason where it failed.
 * @typedef {{
 *   status: string,
 *   buildToken?: string,
 *   downloadUrl?: string,
 *   expiresAt?: string,
 *   failureReason?: string
 * }} ExportStatus
 */

/**
 * Asks about a reporting period's export. Naming a build asks about that
 * build; naming none starts a fresh one, because a finished export is never
 * reused. So a poll must always carry the token it was given back.
 * @param {ExportPeriod & { buildToken?: string, backendToken: string }} request
 * @returns {Promise<ExportStatus>}
 */
export const fetchExportStatus = async ({
  year,
  cadence,
  period,
  buildToken,
  backendToken
}) => {
  const path = `/v1/market-insights/${encodeURIComponent(year)}/${encodeURIComponent(cadence)}/${encodeURIComponent(period)}/export`

  return /** @type {Promise<ExportStatus>} */ (
    fetchJsonFromBackend(buildToken ? forBuild(path, buildToken) : path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${backendToken}`
      }
    })
  )
}
