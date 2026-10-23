import {
  UPLOAD_SUFFIX,
  summaryLogUploadController,
  summaryLogUploadRedirectController
} from '#server/summary-log-upload/controller.js'

const registrationPath =
  '/organisations/{organisationNumber}/registrations/{registrationNumber}'

export const summaryLogUpload = {
  plugin: {
    name: 'summary-log-upload',
    register(server) {
      server.route([
        {
          ...summaryLogUploadRedirectController,
          method: 'GET',
          path: `${registrationPath}${UPLOAD_SUFFIX}`
        },
        {
          ...summaryLogUploadController({ accredited: false }),
          method: 'GET',
          path: `${registrationPath}/{year}${UPLOAD_SUFFIX}`
        },
        {
          ...summaryLogUploadController({ accredited: true }),
          method: 'GET',
          path: `${registrationPath}/accreditations/{year}${UPLOAD_SUFFIX}`
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
