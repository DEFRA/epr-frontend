import Boom from '@hapi/boom'
import Joi from 'joi'

import { readsWasteRecordsDownloads } from '#server/auth/waste-records-downloads.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { backend } from '#server/common/helpers/backend-client.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { yearParam } from '#server/common/helpers/route-params.js'
import { registrationPath as toRegistrationPath } from '#server/reports/helpers/report-paths.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { Year } from '#server/common/helpers/year.js'
 */

export const wasteRecordsCsvDownloadPath =
  '/organisations/{organisationNumber}/registrations/{registrationNumber}/waste-records/download.csv'

/**
 * The address of a registration's latest waste records for a year as CSV.
 * @param {string} registrationPath
 * @param {Year} year
 * @returns {string}
 */
export const buildWasteRecordsCsvDownloadPath = (registrationPath, year) =>
  `${registrationPath}/waste-records/download.csv?year=${year}`

const DEFAULT_CONTENT_TYPE = 'text/csv; charset=utf-8'

/**
 * The year of a link from before downloads named one, such as an old-id
 * address redirected here: every waste record then was 2026's.
 */
const UNNAMED_YEAR = '2026'

/**
 * The not found a caller gets for records it is not offered, or a year the
 * address does not serve, so neither confirms the address exists.
 * @param {HapiRequest} request
 * @param {string} reason
 */
const recordsNotFound = (request, reason) =>
  notFound('Waste records not found', errorCodes.registrationNotFound, {
    event: {
      action: 'download_waste_records_csv',
      reason: `${reason} registrationNumber=${request.params.registrationNumber}`
    }
  })

/**
 * Serves a registration's latest waste records for a year as CSV. The backend
 * generates it, so the body is passed straight through rather than held: an
 * export can be arbitrarily large. A year the backend refuses to export is not
 * found.
 *
 * The registrations plugin is registered unconditionally, so this route guards
 * itself on both the flag and the role rather than inheriting a gate.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const wasteRecordsCsvDownloadController = {
  options: {
    validate: {
      query: Joi.object({ year: yearParam }).unknown(),
      /** @param {HapiRequest} request */
      failAction: (request) => {
        throw recordsNotFound(request, 'year not served')
      }
    }
  },
  /**
   * @param {HapiRequest & { params: RegistrationKeys, query: { year?: Year } }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { backendToken } = request.auth.credentials

    if (!readsWasteRecordsDownloads(request.auth.credentials)) {
      throw recordsNotFound(request, 'records not offered to this caller')
    }

    const { year } = request.query

    if (year === undefined) {
      const query = new URLSearchParams(request.url.search)
      query.set('year', UNNAMED_YEAR)

      return h.redirect(request.localiseUrl(`${request.path}?${query}`))
    }

    const exportPath = `${toRegistrationPath(request.params)}/waste-records/export.csv`

    const { body, contentDisposition, contentType } = await backend(
      backendToken
    )
      .stream(exportPath, { query: { year } })
      .catch((error) => {
        if (!Boom.isBoom(error, statusCodes.unprocessableEntity)) {
          throw error
        }

        throw recordsNotFound(request, 'year not served')
      })

    const response = h.response(body).type(contentType ?? DEFAULT_CONTENT_TYPE)

    return contentDisposition
      ? response.header('Content-Disposition', contentDisposition)
      : response
  }
}
