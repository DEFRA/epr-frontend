import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { sessionNames } from '#server/common/constants/session-names.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import {
  organisationPath,
  registrationPath
} from '#server/reports/helpers/report-paths.js'

const UPLOAD_CONFLICT_VIEW = 'summary-log/upload-conflict'
const PAGE_TITLE_KEY = 'summary-log:pageTitle'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const submitSummaryLogController = {
  /**
   * @param {HapiRequest & { params: SummaryLogParams }} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    const localise = request.t
    const { summaryLogId, ...keys } = request.params

    const redirectUrl = `${registrationPath(keys)}/summary-logs/${summaryLogId}`

    /** @type {SummaryLogsSession | null} */
    const storedSession = request.yar.get(sessionNames.summaryLogs)
    const summaryLogsSession = storedSession ?? {}

    if (summaryLogsSession.freshDataMap?.[summaryLogId]) {
      return h.redirect(redirectUrl)
    }

    const session = request.auth.credentials

    try {
      const responseData = await submitSummaryLog(
        keys,
        summaryLogId,
        session.backendToken
      )

      request.yar.set(sessionNames.summaryLogs, {
        ...summaryLogsSession,
        freshDataMap: {
          ...summaryLogsSession.freshDataMap,
          [summaryLogId]: responseData
        }
      })

      await metrics.journey.end(
        request,
        JOURNEY.uploadSummaryLog,
        keys.registrationNumber
      )

      return h.redirect(redirectUrl)
    } catch (err) {
      if (err.output?.statusCode === statusCodes.conflict) {
        const summaryLog = await fetchSummaryLogStatus(keys, summaryLogId, {
          backendToken: session.backendToken
        }).catch((statusErr) => {
          request.logger.warn({
            message:
              'Failed to fetch summary log status for the upload conflict page; linking home without a year',
            err: statusErr
          })
          return { status: 'unknown' }
        })

        return h.view(UPLOAD_CONFLICT_VIEW, {
          pageTitle: localise(PAGE_TITLE_KEY),
          organisationPath:
            'year' in summaryLog
              ? `${organisationPath(keys)}/${summaryLog.year}`
              : organisationPath(keys)
        })
      }

      throw err
    }
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { SummaryLogParams, SummaryLogsSession } from './types.js'
 */
