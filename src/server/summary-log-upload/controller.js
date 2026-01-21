import Boom from '@hapi/boom'

import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const summaryLogUploadController = {
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
      request.logger.warn({ registrationId }, 'Registration not found')
      throw Boom.notFound('Registration not found')
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
      request.logger.error(
        {
          err,
          event: {
            category: 'upload',
            action: 'summary-log-upload-failed',
            reference: { organisationId, registrationId }
          }
        },
        'Failed to initiate summary log upload'
      )

      return h.view('error/index', {
        pageTitle: localise('summary-log-upload:errorPageTitle'),
        heading: localise('summary-log-upload:errorHeading'),
        message: localise('summary-log-upload:errorGeneric')
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
