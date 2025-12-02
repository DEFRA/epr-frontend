import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { sessionNames } from '#server/common/constants/session-names.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadController = {
  handler: async (request, h) => {
    const localise = request.t
    const { organisationId, registrationId } = request.params

    try {
      const { uploadUrl } = await initiateSummaryLogUpload({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`
      })

      const session = request.yar.get(sessionNames.summaryLogs) || {}
      const formErrors = session.lastError || null
      if (formErrors) {
        delete session.lastError
        request.yar.set(sessionNames.summaryLogs, session)
      }

      return h.view('summary-log-upload/index', {
        pageTitle: localise('summary-log-upload:pageTitle'),
        heading: localise('summary-log-upload:heading'),
        siteName: localise('summary-log-upload:siteName'),
        uploadUrl,
        formErrors
      })
    } catch (err) {
      // @todo: use structured logging
      request.server.log(['error', 'upload'], err)

      return h.view('error/index', {
        pageTitle: localise('summary-log-upload:errorPageTitle'),
        heading: localise('summary-log-upload:errorHeading'),
        error: `${localise('summary-log-upload:errorGeneric')}: ${err.message}`
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
