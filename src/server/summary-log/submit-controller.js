import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { sessionNames } from '#server/common/constants/session-names.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'

const UPLOAD_CONFLICT_VIEW = 'summary-log/upload-conflict'
const PAGE_TITLE_KEY = 'summary-log:pageTitle'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const submitSummaryLogController = {
  handler: async (request, h) => {
    const localise = request.t
    const { organisationId, registrationId, summaryLogId } = request.params

    const { ok, value: session } = await getUserSession(request)

    if (!ok || !session) {
      return h.redirect('/login')
    }

    try {
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
