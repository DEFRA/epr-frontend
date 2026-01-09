import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { sessionNames } from '#server/common/constants/session-names.js'
import { getUserSession } from '#server/auth/helpers/get-user-session.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadController = {
  handler: async (request, h) => {
    const localise = request.t
    const { organisationId, registrationId } = request.params
    const hasError = request.query.error === 'true'

    // If redirected back due to CDP upload error, show generic error page
    if (hasError) {
      return h.view('error/index', {
        pageTitle: localise('error:generic'),
        heading: localise('error:generic'),
        message: localise('error:generic')
      })
    }

    const { ok, value: session } = await getUserSession(request)

    if (!ok || !session) {
      return h.redirect('/login')
    }

    try {
      const { uploadUrl, uploadId, summaryLogId } =
        await initiateSummaryLogUpload({
          organisationId,
          registrationId,
          redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
          idToken: session.idToken
        })

      // Store uploadId in session for status polling reconciliation
      const summaryLogsSession = request.yar.get(sessionNames.summaryLogs) || {}
      request.yar.set(sessionNames.summaryLogs, {
        ...summaryLogsSession,
        uploadId
      })

      const backUrl = `/organisations/${organisationId}/registrations/${registrationId}`
      const successUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`
      const errorUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload?error=true`

      return h.view('summary-log-upload/index', {
        pageTitle: localise('summary-log-upload:pageTitle'),
        heading: localise('summary-log-upload:heading'),
        siteName: localise('summary-log-upload:siteName'),
        uploadUrl,
        successUrl,
        errorUrl,
        backUrl
      })
    } catch (err) {
      // @todo: use structured logging
      request.server.log(['error', 'upload'], err)

      return h.view('error/index', {
        pageTitle: localise('summary-log-upload:errorPageTitle'),
        heading: localise('summary-log-upload:errorHeading'),
        message: `${localise('summary-log-upload:errorGeneric')}: ${err.message}`
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
