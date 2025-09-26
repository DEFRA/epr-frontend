import crypto from 'node:crypto'

import { config } from '~/src/config/config.js'
import { mimeTypes } from '~/src/server/common/constants/mime-types.js'
import { initUpload } from '~/src/server/common/helpers/upload/init-upload.js'
import { sessionNames } from '~/src/server/common/constants/session-names.js'
import { summaryLogStatuses } from '~/src/server/common/constants/statuses.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadController = {
  handler: async (request, h) => {
    const { organisationId, registrationId } = request.params

    const summaryLogId = crypto.randomUUID()
    const s3Bucket = config.get('cdpUploader.s3buckets.summaryLogs')

    try {
      const { uploadId, uploadUrl, statusUrl } = await initUpload({
        redirect: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/progress`,
        s3Bucket,
        s3path: `/organisations/${organisationId}/registrations/${registrationId}`,
        mimeTypes: [mimeTypes.xlsx],
        metadata: {
          summaryLogId
        }
      })

      request.yar.set(sessionNames.summaryLogs, {
        summaryLogId,
        summaryLogStatus: summaryLogStatuses.initiated,
        statusUrl,
        uploadId,
        uploadUrl
      })

      return h.view('summary-log-upload/index', {
        pageTitle: 'Summary log: upload', // @todo use activity/site/material info
        heading: 'Upload your summary log',
        siteName: 'Test site', // @fixme
        organisationId,
        registrationId,
        summaryLogId,
        uploadId,
        uploadUrl
      })
    } catch (err) {
      // @todo: use structured logging
      request.server.log(['error', 'upload'], err)

      return h.view('error/index', {
        pageTitle: 'Summary log: upload error',
        heading: 'Summary log upload error',
        error: `Failed to initialize upload: ${err.message}`
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
