import { readsWasteRecordsDownloads } from '#server/auth/waste-records-downloads.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { fetchStreamFromBackend } from '#server/common/helpers/fetch-stream-from-backend.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

export const wasteRecordsCsvDownloadPath =
  '/organisations/{organisationId}/registrations/{registrationId}/waste-records/download.csv'

/**
 * The address of a registration's latest waste records as CSV. Segments go
 * straight into an href, so each is encoded.
 * @param {{ organisationId: string, registrationId: string }} ids
 * @returns {string}
 */
export const buildWasteRecordsCsvDownloadPath = ({
  organisationId,
  registrationId
}) =>
  [
    'organisations',
    organisationId,
    'registrations',
    registrationId,
    'waste-records',
    'download.csv'
  ]
    .map((segment) => `/${encodeURIComponent(segment)}`)
    .join('')

const DEFAULT_CONTENT_TYPE = 'text/csv; charset=utf-8'

/**
 * Serves a registration's latest waste records as CSV. The backend generates
 * it, so the body is passed straight through rather than held: an export can
 * be arbitrarily large.
 *
 * The registrations plugin is registered unconditionally, so this route guards
 * itself on both the flag and the role rather than inheriting a gate.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const wasteRecordsCsvDownloadController = {
  /**
   * @param {HapiRequest & {
   *   params: { organisationId: string, registrationId: string }
   * }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationId, registrationId } = request.params
    const { backendToken } = request.auth.credentials

    if (!readsWasteRecordsDownloads(request.auth.credentials)) {
      throw notFound(
        'Waste records not found',
        errorCodes.registrationNotFound,
        {
          event: {
            action: 'download_waste_records_csv',
            reason: `records not offered to this caller registrationId=${registrationId}`
          }
        }
      )
    }

    const { body, contentDisposition, contentType } =
      await fetchStreamFromBackend(
        `/v1/organisations/${organisationId}/registrations/${registrationId}/waste-records/export.csv`,
        { method: 'GET', headers: { Authorization: `Bearer ${backendToken}` } }
      )

    const response = h.response(body).type(contentType ?? DEFAULT_CONTENT_TYPE)

    return contentDisposition
      ? response.header('Content-Disposition', contentDisposition)
      : response
  }
}
