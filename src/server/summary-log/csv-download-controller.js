import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { fetchStreamFromBackend } from '#server/common/helpers/fetch-stream-from-backend.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

export const summaryLogCsvDownloadPath =
  '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/files/{fileId}/download.csv'

/**
 * The address of one summary log's records as CSV, addressed by its file - the
 * id the ledger records. Segments go straight into an href, so each is
 * encoded.
 *
 * The `.csv` suffix keeps the journey tests' `a[href$="/download"]` selector
 * matching the workbook link alone.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   fileId: string
 * }} ids
 * @returns {string}
 */
export const buildSummaryLogCsvDownloadPath = ({
  organisationId,
  registrationId,
  fileId
}) =>
  [
    'organisations',
    organisationId,
    'registrations',
    registrationId,
    'summary-logs',
    'files',
    fileId,
    'download.csv'
  ]
    .map((segment) => `/${encodeURIComponent(segment)}`)
    .join('')

const DEFAULT_CONTENT_TYPE = 'text/csv; charset=utf-8'

/**
 * Serves the records of the summary log a regulator asked for, as CSV. The
 * backend generates it, so the body is passed straight through rather than
 * held: an export can be arbitrarily large.
 *
 * The plugin this sits in is registered unconditionally, being operator-facing,
 * so this route guards itself rather than inheriting a gate.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const summaryLogCsvDownloadController = {
  /**
   * @param {HapiRequest & {
   *   params: {
   *     organisationId: string,
   *     registrationId: string,
   *     fileId: string
   *   }
   * }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId, fileId } = request.params
    const { backendToken } = request.auth.credentials

    if (!readsAsARegulator(request.auth.credentials)) {
      throw notFound(
        'Summary log records not found',
        errorCodes.summaryLogNotFound,
        {
          event: {
            action: 'download_summary_log_csv',
            reason: `caller does not read as a regulator fileId=${fileId}`
          }
        }
      )
    }

    const { body, contentDisposition, contentType } =
      await fetchStreamFromBackend(
        `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/files/${fileId}/records.csv`,
        { method: 'GET', headers: { Authorization: `Bearer ${backendToken}` } }
      )

    const response = h.response(body).type(contentType ?? DEFAULT_CONTENT_TYPE)

    return contentDisposition
      ? response.header('Content-Disposition', contentDisposition)
      : response
  }
}
