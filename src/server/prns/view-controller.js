import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchPackagingRecyclingNote } from '#server/common/helpers/packaging-recycling-notes/fetch-packaging-recycling-note.js'
import { getRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-registration-with-accreditation.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const viewController = {
  async handler(request, h) {
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, prnId } = request.params
    const { t: localise } = request
    const session = request.auth.credentials

    // Check for session data first (success case after creating a PRN)
    const prnCreated = request.yar.get('prnCreated')

    if (prnCreated && prnCreated.id === prnId) {
      // Clear the session data
      request.yar.clear('prnCreated')

      const noteType =
        prnCreated.wasteProcessingType === 'exporter' ? 'perns' : 'prns'

      return h.view('prns/success', {
        pageTitle: localise(`prns:${noteType}:successPageTitle`),
        heading: localise(`prns:${noteType}:successHeading`),
        tonnageLabel: localise(`prns:${noteType}:successTonnageLabel`),
        tonnage: prnCreated.tonnage,
        tonnageSuffix: localise('prns:tonnageSuffix'),
        nextStepsHeading: localise('prns:successNextStepsHeading'),
        nextStepsText: localise(`prns:${noteType}:successNextStepsText`),
        returnLink: localise('prns:successReturnLink'),
        organisationId,
        registrationId
      })
    }

    // Fetch PRN data from backend for viewing existing PRN
    const { registration } = await getRegistrationWithAccreditation(
      organisationId,
      registrationId,
      session.idToken
    )

    if (!registration) {
      throw Boom.notFound('Registration not found')
    }

    const prn = await fetchPackagingRecyclingNote(
      organisationId,
      registrationId,
      prnId,
      session.idToken
    )

    if (!prn) {
      throw Boom.notFound('PRN not found')
    }

    const isExporter = registration.wasteProcessingType === 'exporter'
    const noteType = isExporter ? 'perns' : 'prns'

    const backUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes`
    )

    const viewData = buildViewData(request, {
      organisationId,
      registrationId,
      prn,
      noteType,
      backUrl,
      localise
    })

    return h.view('prns/view', viewData)
  }
}

/**
 * Build view data for the PRN view page
 * @param {Request} request
 * @param {object} options
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {object} options.prn
 * @param {string} options.noteType
 * @param {string} options.backUrl
 * @param {(key: string) => string} options.localise
 * @returns {object}
 */
function buildViewData(
  request,
  { organisationId, registrationId, prn, noteType, backUrl, localise }
) {
  const noteLabel = noteType === 'perns' ? 'PERN' : 'PRN'

  const statusConfig = getStatusConfig(prn.status, localise)

  const detailRows = [
    {
      key: { text: localise('prns:view:issuedTo') },
      value: { text: prn.issuedToOrganisation }
    },
    {
      key: { text: localise('prns:view:tonnage') },
      value: { text: `${prn.tonnage} ${localise('prns:tonnageSuffix')}` }
    },
    {
      key: { text: localise('prns:view:material') },
      value: { text: formatMaterial(prn.material) }
    },
    {
      key: { text: localise('prns:view:dateCreated') },
      value: { text: formatDate(prn.createdAt) }
    }
  ]

  return {
    pageTitle: `${noteLabel} ${prn.id}`,
    caption: noteLabel,
    heading: prn.id,
    statusLabel: localise('prns:view:status'),
    statusText: statusConfig.text,
    statusClass: statusConfig.class,
    detailsHeading: localise('prns:view:detailsHeading'),
    detailRows,
    backUrl,
    returnLink: {
      href: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/packaging-recycling-notes`
      ),
      text: localise(`prns:view:${noteType}:returnLink`)
    }
  }
}

/**
 * Get status display configuration
 * @param {string} status
 * @param {(key: string) => string} localise
 * @returns {{text: string, class: string}}
 */
function getStatusConfig(status, localise) {
  const statusMap = {
    awaiting_authorisation: {
      text: localise('prns:list:status:awaitingAuthorisation'),
      class: 'govuk-tag--yellow'
    },
    issued: {
      text: localise('prns:list:status:issued'),
      class: 'govuk-tag--green'
    },
    cancelled: {
      text: localise('prns:list:status:cancelled'),
      class: 'govuk-tag--red'
    }
  }

  return statusMap[status] ?? { text: status, class: '' }
}

/**
 * Format date for display
 * @param {string} dateString
 * @returns {string}
 */
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Format material for display
 * @param {string} material
 * @returns {string}
 */
function formatMaterial(material) {
  if (!material) return ''
  return material.charAt(0).toUpperCase() + material.slice(1)
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { Request } from '@hapi/hapi'
 */
