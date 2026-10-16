import { readsWasteRecordsDownloads } from '#server/auth/waste-records-downloads.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { backend } from '#server/common/helpers/backend-client.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { registrationPath as toRegistrationPath } from '#server/reports/helpers/report-paths.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */

export const wasteRecordsCsvDownloadPath =
  '/organisations/{organisationNumber}/registrations/{registrationNumber}/waste-records/download.csv'

/**
 * The address of a registration's latest waste records as CSV.
 * @param {string} registrationPath
 * @returns {string}
 */
export const buildWasteRecordsCsvDownloadPath = (registrationPath) =>
  `${registrationPath}/waste-records/download.csv`

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
   * @param {HapiRequest & { params: RegistrationKeys }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { backendToken } = request.auth.credentials

    if (!readsWasteRecordsDownloads(request.auth.credentials)) {
      throw notFound(
        'Waste records not found',
        errorCodes.registrationNotFound,
        {
          event: {
            action: 'download_waste_records_csv',
            reason: `records not offered to this caller registrationNumber=${request.params.registrationNumber}`
          }
        }
      )
    }

    const { body, contentDisposition, contentType } = await backend(
      backendToken
    ).stream(`${toRegistrationPath(request.params)}/waste-records/export.csv`)

    const response = h.response(body).type(contentType ?? DEFAULT_CONTENT_TYPE)

    return contentDisposition
      ? response.header('Content-Disposition', contentDisposition)
      : response
  }
}
