import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { sessionNames } from '#server/common/constants/session-names.js'
import { statusCodes } from '#server/common/constants/status-codes.js'

const UPLOAD_CONFLICT_VIEW = 'summary-log/upload-conflict'
const PAGE_TITLE_KEY = 'summary-log:pageTitle'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const submitSummaryLogController = {
  handler: async (request, h) => {
    const localise = request.t
    const { organisationId, registrationId, summaryLogId } = request.params

    const redirectUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`

    const summaryLogsSession = request.yar.get(sessionNames.summaryLogs) || {}

    if (summaryLogsSession.freshData) {
      return h.redirect(redirectUrl)
    }

    const session = request.auth.credentials

    try {
      const responseData = await submitSummaryLog(
        organisationId,
        registrationId,
        summaryLogId,
        session.idToken
      )

      request.yar.set(sessionNames.summaryLogs, {
        ...summaryLogsSession,
        freshData: responseData
      })

      return h.redirect(redirectUrl)
    } catch (err) {
      if (err.output?.statusCode === statusCodes.conflict) {
        return h.view(UPLOAD_CONFLICT_VIEW, {
          pageTitle: localise(PAGE_TITLE_KEY),
          organisationId
        })
      }

      throw err
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
