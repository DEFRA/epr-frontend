import { errorCodes } from '#server/common/enums/error-codes.js'
import {
  badGateway,
  notFound
} from '#server/common/helpers/logging/cdp-boom.js'
import {
  isAllowedDownloadUrl,
  signedDisposition
} from '#server/common/helpers/presigned-download.js'

import { fetchExportStatus } from '../helpers/fetch-export-status.js'
import { buildQuerySchema } from './build-query-schema.js'
import { marketInsightsExportStatuses } from './statuses.js'

/**
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { BuildQuery } from './build-query-schema.js'
 * @import { ExportPeriod } from './paths.js'
 */

const ZIP_CONTENT_TYPE = 'application/zip'
const ACTION = 'download_market_insights_export'

/**
 * @param {string} reason
 * @returns {never}
 */
const noSuchExport = (reason) => {
  throw notFound(
    'Market insights export not found',
    errorCodes.marketInsightsExportNotFound,
    { event: { action: ACTION, reason } }
  )
}

/**
 * Serves the export's zip.
 *
 * The frontend builds no files: the backend signs an address for the object it
 * stored and this follows it server-side, so the regulator never holds a
 * storage URL. Following an address upstream chose is why the allow-list is
 * checked before anything is fetched.
 *
 * The build is named, so this serves the one the page was watching. An
 * address naming none would start a new build and never have a file to serve.
 * @satisfies {Partial<HapiServerRoute<HapiRequest & { query: BuildQuery }>>}
 */
export const marketInsightsExportDownloadController = {
  options: {
    validate: {
      query: buildQuerySchema
    }
  },
  /**
   * @param {HapiRequest & { params: ExportPeriod, query: BuildQuery }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { year, cadence, period } = request.params
    const { build: buildToken } = request.query
    const { backendToken } = request.auth.credentials

    const { status, downloadUrl } = await fetchExportStatus({
      year,
      cadence,
      period,
      buildToken,
      backendToken
    })

    if (status !== marketInsightsExportStatuses.ready || !downloadUrl) {
      noSuchExport(
        `export is not ready period=${year}/${cadence}/${period} status=${status}`
      )
    }

    if (!isAllowedDownloadUrl(downloadUrl)) {
      throw badGateway(
        'Market insights export URL is not an allowed storage address',
        errorCodes.externalRedirectInvalid,
        { event: { action: ACTION, reason: 'disallowed_download_host' } }
      )
    }

    const zip = await fetch(downloadUrl)

    if (!zip.ok) {
      throw badGateway(
        `Failed to fetch market insights export: ${zip.status}`,
        errorCodes.externalFetchFailed,
        { event: { action: ACTION, reason: `storage_responded_${zip.status}` } }
      )
    }

    const response = h
      .response(Buffer.from(await zip.arrayBuffer()))
      .type(zip.headers.get('content-type') ?? ZIP_CONTENT_TYPE)

    const disposition =
      signedDisposition(downloadUrl) ?? zip.headers.get('content-disposition')

    return disposition
      ? response.header('Content-Disposition', disposition)
      : response
  }
}
