import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { sessionNames } from '#server/common/constants/session-names.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const submitSummaryLogController = {
  handler: async (request, h) => {
    const { organisationId, registrationId, summaryLogId } = request.params

    const { ok, value: session } = await getUserSession(request)

    if (!ok || !session) {
      return h.redirect('/login')
    }

    // Submit the summary log to the backend
    const responseData = await submitSummaryLog(
      organisationId,
      registrationId,
      summaryLogId,
      session.idToken
    )

    // Store response data in session to prevent race condition
    const summaryLogsSession = request.yar.get(sessionNames.summaryLogs) || {}
    request.yar.set(sessionNames.summaryLogs, {
      ...summaryLogsSession,
      freshData: responseData
    })

    // Redirect to GET route
    return h.redirect(
      `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
    )
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
