/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadController = {
  handler(_request, h) {
    return h.view('summary-log-upload/index', {
      pageTitle: 'Summary log: upload', // @todo use activity/site/material info
      heading: 'Upload your summary log',
      siteName: 'Test site', // @fixme
      organisationId: '123', // @fixme
      registrationId: '456', // @fixme
      uploadId: '789' // @fixme
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
