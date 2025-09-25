/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadProgressController = {
  handler(_request, h) {
    return h.view('summary-log-upload-progress/index', {
      pageTitle: 'Summary log: upload progress', // @todo use activity/site/material info
      heading: 'Your file is being uploaded',
      organisationId: '123', // @fixme
      registrationId: '456', // @fixme
      uploadId: '789' // @fixme
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
