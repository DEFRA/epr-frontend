import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

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

    const organisationData = await fetchOrganisationById(
      organisationId,
      session.idToken
    )

    const registration = organisationData.registrations?.find(
      ({ id }) => id === registrationId
    )

    if (!registration) {
      request.logger.warn({
        message: 'Registration not found',
        event: {
          action: 'fetch_registration',
          reason: `organisationId=${organisationId} registrationId=${registrationId}`
        }
      })
      throw notFound(
        'Registration not found',
        errorCodes.registrationNotFound,
        {
          event: {
            action: 'fetch_registration',
            reason: `organisationId=${organisationId} registrationId=${registrationId}`
          }
        }
      )
    }

    try {
      const { uploadUrl } = await initiateSummaryLogUpload({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: session.idToken
      })

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
