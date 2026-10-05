import { hasWriteScope } from '#server/auth/scopes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { registrationUploadYear } from '#server/common/helpers/upload/registration-upload-year.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const summaryLogUploadController = {
  /**
   * @param {HapiRequest & { params: { organisationId: string, registrationId: string } }} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    const localise = request.t
    const { organisationId, registrationId } = request.params

    const session = request.auth.credentials

    const { registration } = await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.backendToken
    )

    try {
      // Starting an upload creates a summary log, so this GET writes. A session
      // holding no write scope reads the page without one; the form is hidden.
      const canUpload = hasWriteScope(session)

      const { uploadUrl } = canUpload
        ? await initiateSummaryLogUpload({
            organisationId,
            registrationId,
            year: registrationUploadYear(registration),
            redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
            backendToken: session.backendToken
          })
        : {}

      if (canUpload) {
        await metrics.journey.start(
          request,
          JOURNEY.uploadSummaryLog,
          registrationId
        )
      }

      const backUrl = `/organisations/${organisationId}/registrations/${registrationId}`

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
          reference: `organisationId=${organisationId}, registrationId=${registrationId}`
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
 */
