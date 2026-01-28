import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const checkController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId } = request.params
    const { t: localise } = request
    const session = request.auth.credentials

    // Retrieve draft PRN data from session
    const prnDraft = request.yar.get('prnDraft')

    if (!prnDraft) {
      // No draft in session - redirect to create page
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/create-prn`
      )
    }

    const { registration } = await getRegistrationWithAccreditation(
      organisationId,
      registrationId,
      session.idToken
    )

    const noteType =
      registration.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

    const displayMaterial = getDisplayMaterial(registration)

    return h.view('prns/check', {
      pageTitle: localise(`prns:${noteType}:checkPageTitle`),
      heading: localise(`prns:${noteType}:checkHeading`),
      summaryRows: [
        {
          key: { text: localise('prns:materialLabel') },
          value: { text: displayMaterial }
        },
        {
          key: { text: localise('prns:tonnageLabel') },
          value: {
            text: `${prnDraft.tonnage} ${localise('prns:tonnageSuffix')}`
          }
        },
        {
          key: { text: localise('prns:recipientSummaryLabel') },
          value: { text: prnDraft.recipientName }
        },
        ...(prnDraft.notes
          ? [
              {
                key: { text: localise('prns:notesLabel') },
                value: { text: prnDraft.notes }
              }
            ]
          : [])
      ],
      confirmButton: {
        text: localise(`prns:${noteType}:confirmButton`)
      },
      cancelLink: {
        text: localise('prns:cancelButton'),
        href: `/organisations/${organisationId}/registrations/${registrationId}`
      },
      organisationId,
      registrationId
    })
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const checkPostController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId } = request.params

    // Retrieve draft PRN data from session
    const prnDraft = request.yar.get('prnDraft')

    if (!prnDraft) {
      // No draft in session - redirect to create page
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/create-prn`
      )
    }

    // Clear draft and store for success page
    request.yar.clear('prnDraft')
    request.yar.set('prnCreated', {
      id: prnDraft.id,
      tonnage: prnDraft.tonnage,
      material: prnDraft.material,
      status: prnDraft.status,
      wasteProcessingType: prnDraft.wasteProcessingType
    })

    return h.redirect(
      `/organisations/${organisationId}/registrations/${registrationId}/create-prn/success`
    )
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
