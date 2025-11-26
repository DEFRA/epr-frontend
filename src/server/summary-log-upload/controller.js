import crypto from 'node:crypto'

import { config } from '#config/config.js'
import { mimeTypes } from '#server/common/constants/mime-types.js'
import { initUpload } from '#server/common/helpers/upload/init-upload.js'
import { sessionNames } from '#server/common/constants/session-names.js'
import { summaryLogStatuses } from '#server/common/constants/statuses.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadController = {
  handler: async (request, h) => {
    const localise = request.t
    const { organisationId, registrationId } = request.params

    const summaryLogId = crypto.randomUUID()
    const s3Bucket = config.get('cdpUploader.s3buckets.summaryLogs')
    const eprBackendUrl = config.get('eprBackendUrl')

    try {
      const { uploadId, uploadUrl, statusUrl } = await initUpload({
        redirect: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`,
        callback: `${eprBackendUrl}/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/upload-completed`,
        s3Bucket,
        s3path: `/organisations/${organisationId}/registrations/${registrationId}`,
        mimeTypes: [mimeTypes.xlsx],
        metadata: {
          summaryLogId
        }
      })

      const existingSession = request.yar.get(sessionNames.summaryLogs) || {}

      request.yar.set(sessionNames.summaryLogs, {
        ...existingSession,
        summaryLogId,
        summaryLogStatus: summaryLogStatuses.initiated,
        statusUrl,
        uploadId,
        uploadUrl
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
        organisationId,
        registrationId,
        summaryLogId,
        uploadId,
        uploadUrl,
        formErrors,
        defraId: request.server.app.defraId
      })
    } catch (err) {
      // @todo: use structured logging
      request.server.log(['error', 'upload'], err)

      return h.view('error/index', {
        pageTitle: localise('summary-log-upload:errorPageTitle'),
        heading: localise('summary-log-upload:errorHeading'),
        error: `${localise('summary-log-upload:errorGeneric')}: ${err.message}`,
        defraId: request.server.app.defraId
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
