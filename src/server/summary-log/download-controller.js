import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { fetchRedirectFromBackend } from '#server/common/helpers/fetch-redirect-from-backend.js'
import {
  badGateway,
  notFound
} from '#server/common/helpers/logging/cdp-boom.js'
import {
  isAllowedDownloadUrl,
  signedDisposition
} from '#server/common/helpers/presigned-download.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

export const summaryLogDownloadPath =
  '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/files/{fileId}/download'

/**
 * The address of one summary log's download, addressed by its file - which is
 * what the ledger records. Segments go straight into an href, so each is
 * encoded.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   fileId: string
 * }} ids
 * @returns {string}
 */
export const buildSummaryLogDownloadPath = ({
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
    'download'
  ]
    .map((segment) => `/${encodeURIComponent(segment)}`)
    .join('')

const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

/**
 * @param {string} reason
 * @returns {never}
 */
const noSuchDownload = (reason) => {
  throw notFound(
    'Summary log download not found',
    errorCodes.summaryLogNotFound,
    { event: { action: 'download_summary_log', reason } }
  )
}

/**
 * Serves the summary log file a regulator asked for.
 *
 * The plugin this sits in is registered unconditionally, being operator-facing,
 * so this route guards itself rather than inheriting a gate.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const summaryLogDownloadController = {
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
      noSuchDownload(`caller does not read as a regulator fileId=${fileId}`)
    }

    const downloadUrl = await fetchRedirectFromBackend(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/files/${fileId}`,
      { method: 'GET', headers: { Authorization: `Bearer ${backendToken}` } }
    )

    if (!isAllowedDownloadUrl(downloadUrl)) {
      throw badGateway(
        'Summary log download URL is not an allowed storage address',
        errorCodes.externalRedirectInvalid,
        {
          event: {
            action: 'download_summary_log',
            reason: 'disallowed_download_host'
          }
        }
      )
    }

    const file = await fetch(downloadUrl)

    if (!file.ok) {
      throw badGateway(
        `Failed to fetch summary log file: ${file.status}`,
        errorCodes.externalFetchFailed,
        {
          event: {
            action: 'download_summary_log',
            reason: `storage_responded_${file.status}`
          }
        }
      )
    }

    const response = h
      .response(Buffer.from(await file.arrayBuffer()))
      .type(file.headers.get('content-type') ?? DEFAULT_CONTENT_TYPE)

    const disposition =
      signedDisposition(downloadUrl) ?? file.headers.get('content-disposition')

    return disposition
      ? response.header('Content-Disposition', disposition)
      : response
  }
}
