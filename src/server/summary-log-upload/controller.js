import { hasWriteScope } from '#server/auth/scopes.js'
import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { registrationPath as toRegistrationPath } from '#server/reports/helpers/report-paths.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const summaryLogUploadController = {
  /**
   * @param {HapiRequest & { params: RegistrationKeys }} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    const localise = request.t
    const keys = request.params
    const { organisationNumber, registrationNumber } = keys
    const registrationPath = toRegistrationPath(keys)

    const session = request.auth.credentials

    const { accreditation } = await fetchRegistrationWithAccreditation(
      keys,
      session.backendToken
    )

    try {
      // Starting an upload creates a summary log, so this GET writes. A session
      // holding no write scope reads the page without one; the form is hidden.
      const canUpload = hasWriteScope(session)

      const { uploadUrl } = canUpload
        ? await initiateSummaryLogUpload({
            keys,
            accredited: accreditation !== undefined,
            redirectUrl: `${registrationPath}/summary-logs/{summaryLogId}`,
            backendToken: session.backendToken
          })
        : {}

      if (canUpload) {
        await metrics.journey.start(
          request,
          JOURNEY.uploadSummaryLog,
          registrationNumber
        )
      }

      const backUrl = registrationPath

      return h.view('summary-log-upload/index', {
        pageTitle: localise('summary-log-upload:pageTitle'),
        heading: localise('summary-log-upload:heading'),
        caption: localise('summary-log-upload:caption'),
        introText: localise('summary-log-upload:introText'),
        uploadUrl,
        backUrl
      })
    } catch (err) {
      request.logger.error({
        message: 'Failed to initiate summary log upload',
        err,
        event: {
          category: 'upload',
          action: 'summary-log-upload-failed',
          reference: `organisationNumber=${organisationNumber}, registrationNumber=${registrationNumber}`
        }
      })

      return h.view('error/index', {
        pageTitle: localise('summary-log-upload:errorPageTitle'),
        heading: localise('summary-log-upload:errorHeading'),
        message: localise('summary-log-upload:errorGeneric')
      })
    }
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */
