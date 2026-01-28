import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/**
 * Formats an address object into a single line string
 * @param {object} address - Address object with line1, line2, town, postcode etc
 * @returns {string} Formatted address string
 */
function formatAddress(address) {
  if (!address) {
    return ''
  }

  const parts = [
    address.line1,
    address.line2,
    address.town,
    address.postcode
  ].filter(Boolean)

  return parts.join(', ')
}

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

    const { organisationData, registration } =
      await getRegistrationWithAccreditation(
        organisationId,
        registrationId,
        session.idToken
      )

    const isExporter = registration.wasteProcessingType === 'exporter'
    const noteType = isExporter ? 'perns' : 'prns'

    const displayMaterial = getDisplayMaterial(registration)

    // Build PRN/PERN details rows
    const prnDetailRows = [
      {
        key: { text: localise('prns:issuedByLabel') },
        value: { text: organisationData.name }
      },
      {
        key: { text: localise('prns:issuedToLabel') },
        value: { text: prnDraft.recipientName }
      },
      {
        key: { text: localise('prns:tonnageLabel') },
        value: { text: prnDraft.tonnage }
      },
      {
        key: { text: localise('prns:tonnageInWordsLabel') },
        value: { text: prnDraft.tonnageInWords || '' }
      },
      {
        key: { text: localise('prns:processToBeUsedLabel') },
        value: { text: prnDraft.processToBeUsed || '' }
      },
      {
        key: { text: localise('prns:decemberWasteLabel') },
        value: {
          text: prnDraft.isDecemberWaste
            ? localise('prns:decemberWasteYes')
            : localise('prns:decemberWasteNo')
        }
      },
      {
        key: { text: localise('prns:issueCommentsLabel') },
        value: { text: prnDraft.notes || localise('prns:notProvided') }
      },
      {
        key: { text: localise('prns:issuedDateLabel') },
        value: { text: '' }
      },
      {
        key: { text: localise('prns:authorisedByLabel') },
        value: { text: '' }
      },
      {
        key: { text: localise('prns:positionLabel') },
        value: { text: '' }
      }
    ]

    // Build accreditation details rows
    const accreditationRows = [
      {
        key: { text: localise('prns:materialLabel') },
        value: { text: displayMaterial }
      },
      {
        key: { text: localise('prns:accreditationNumberLabel') },
        value: { text: registration.accreditationNumber || '' }
      },
      {
        key: { text: localise('prns:accreditationAddressLabel') },
        value: { text: formatAddress(registration.site?.address) }
      }
    ]

    return h.view('prns/check', {
      pageTitle: localise(`prns:${noteType}:checkPageTitle`),
      caption: localise(`prns:${noteType}:caption`),
      heading: localise(`prns:${noteType}:checkHeading`),
      introText: localise(`prns:${noteType}:checkIntroText`),
      authorisationText: localise(`prns:${noteType}:checkAuthorisationText`),
      insetText: localise(`prns:${noteType}:checkInsetText`),
      prnDetailsHeading: localise(
        isExporter ? 'prns:pernDetailsHeading' : 'prns:prnDetailsHeading'
      ),
      prnDetailRows,
      accreditationDetailsHeading: localise('prns:accreditationDetailsHeading'),
      accreditationRows,
      createButton: {
        text: localise(`prns:${noteType}:createButton`)
      },
      cancelButton: {
        text: localise(`prns:${noteType}:cancelButton`),
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
    const session = request.auth.credentials

    // Retrieve draft PRN data from session
    const prnDraft = request.yar.get('prnDraft')

    if (!prnDraft) {
      // No draft in session - redirect to create page
      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/create-prn`
      )
    }

    try {
      // Update PRN status from draft to awaiting_authorisation
      const result = await updatePrnStatus(
        organisationId,
        registrationId,
        prnDraft.id,
        { status: 'awaiting_authorisation' },
        session.idToken
      )

      // Clear draft and store for success page
      request.yar.clear('prnDraft')
      request.yar.set('prnCreated', {
        id: result.id,
        tonnage: result.tonnage,
        material: result.material,
        status: result.status,
        wasteProcessingType: prnDraft.wasteProcessingType
      })

      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/create-prn/success`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to update PRN status')

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation('Failed to confirm PRN')
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
