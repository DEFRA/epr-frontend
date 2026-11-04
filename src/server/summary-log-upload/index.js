import { summaryLogUploadPathUnder } from '#server/reports/helpers/report-paths.js'
import {
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
          path: summaryLogUploadPathUnder(registrationPath)
        },
        {
          ...summaryLogUploadController({ accredited: false }),
          method: 'GET',
          path: summaryLogUploadPathUnder(`${registrationPath}/{year}`)
        },
        {
          ...summaryLogUploadController({ accredited: true }),
          method: 'GET',
          path: summaryLogUploadPathUnder(
            `${registrationPath}/accreditations/{year}`
          )
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
