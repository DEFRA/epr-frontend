import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { tonnageToWords } from './helpers/tonnage-to-words.js'
import { formatDateForDisplay } from './helpers/format-date-for-display.js'
import { getLumpyDisplayMaterial } from './helpers/get-lumpy-display-material.js'
import { getRecipientDisplayName } from './helpers/stub-recipients.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const actionController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    const [{ organisationData, registration, accreditation }, prn] =
      await Promise.all([
        fetchRegistrationAndAccreditation(
          organisationId,
          registrationId,
          session.idToken
        ),
        fetchPackagingRecyclingNote(
          organisationId,
          registrationId,
          accreditationId,
          prnId,
          session.idToken
        )
      ])

    if (!registration) {
      throw Boom.notFound('Registration not found')
    }

    const isExporter = registration.wasteProcessingType === 'exporter'
    const noteType = isExporter ? 'perns' : 'prns'

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes`

    const backUrl = request.localiseUrl(basePath)

    const displayMaterial = getLumpyDisplayMaterial(registration)
    const isNotDraft = prn.status !== 'draft'
    const isAwaitingAuthorisation = prn.status === 'awaiting_authorisation'

    const statusConfig = getStatusConfig(prn.status, localise)

    const prnDetailRows = buildActionPrnDetailRows({
      prn,
      organisationData,
      localise,
      isExporter,
      statusConfig,
      isNotDraft
    })

    const accreditationRows = buildAccreditationRows({
      registration,
      accreditation,
      displayMaterial,
      localise,
      isExporter
    })

    const issueUrl = `${basePath}/${prnId}/issue`
    const viewUrl = `${basePath}/${prnId}/view`
    const deleteUrl = `${basePath}/${prnId}/discard`

    const viewData = {
      pageTitle: `${isExporter ? 'PERN' : 'PRN'} ${prn.id}`,
      heading: isExporter ? 'PERN' : 'PRN',
      insetText: localise(`lprns:action:${noteType}:insetText`),
      viewLink: {
        text: localise(`lprns:action:${noteType}:viewLink`),
        href: request.localiseUrl(viewUrl)
      },
      prnDetailsHeading: localise(
        isExporter ? 'lprns:pernDetailsHeading' : 'lprns:prnDetailsHeading'
      ),
      prnDetailRows,
      accreditationDetailsHeading: localise(
        'lprns:accreditationDetailsHeading'
      ),
      accreditationRows,
      backUrl,
      issueButton: isAwaitingAuthorisation
        ? {
            text: localise(`lprns:action:${noteType}:issueButton`),
            action: request.localiseUrl(issueUrl)
          }
        : null,
      deleteLink: isAwaitingAuthorisation
        ? {
            text: localise(`lprns:action:${noteType}:deleteLink`),
            href: request.localiseUrl(deleteUrl)
          }
        : null,
      returnLink: {
        href: request.localiseUrl(basePath),
        text: localise(`lprns:action:${noteType}:returnLink`)
      }
    }

    if (request.query.error === 'insufficient_balance') {
      const message = localise('lprns:insufficientBalanceError')
      viewData.errors = {}
      viewData.errorSummary = {
        title: localise('lprns:errorSummaryTitle'),
        list: [{ text: message }]
      }
    }

    return h.view('lprns/action', viewData)
  }
}

/**
 * Builds the PRN/PERN details rows for the action page
 * @param {object} params
 * @param {object} params.prn - PRN data from backend
 * @param {object} params.organisationData - Organisation data
 * @param {(key: string) => string} params.localise - Translation function
 * @param {boolean} params.isExporter - Whether the registration is for an exporter
 * @param {{text: string, class: string}} params.statusConfig - Status display config
 * @param {boolean} params.isNotDraft - Whether the PRN is not a draft
 * @returns {Array} Summary list rows
 */
function buildActionPrnDetailRows({
  prn,
  organisationData,
  localise,
  isExporter,
  statusConfig,
  isNotDraft
}) {
  const numberLabel = isExporter
    ? 'lprns:pernNumberLabel'
    : 'lprns:prnNumberLabel'
  const rows = [{ key: { text: localise(numberLabel) }, value: { text: '' } }]

  if (isNotDraft) {
    rows.push({
      key: { text: localise('lprns:view:status') },
      value: {
        html: `<strong class="govuk-tag ${statusConfig.class}">${statusConfig.text}</strong>`
      }
    })
  }

  const decemberWasteText = prn.isDecemberWaste
    ? localise('lprns:decemberWasteYes')
    : localise('lprns:decemberWasteNo')

  const tonnageInWords = prn.tonnageInWords || tonnageToWords(prn.tonnage)

  rows.push(
    {
      key: { text: localise('lprns:buyerLabel') },
      value: { text: getRecipientDisplayName(prn.issuedToOrganisation) }
    },
    {
      key: { text: localise('lprns:tonnageLabel') },
      value: { text: String(prn.tonnage) }
    },
    {
      key: { text: localise('lprns:tonnageInWordsLabel') },
      value: { text: tonnageInWords }
    },
    {
      key: { text: localise('lprns:processToBeUsedLabel') },
      value: { text: prn.processToBeUsed || '' }
    },
    {
      key: { text: localise('lprns:decemberWasteLabel') },
      value: { text: decemberWasteText }
    }
  )

  const issuedDate = prn.authorisedAt
    ? formatDateForDisplay(prn.authorisedAt)
    : ''
  const issuedBy =
    organisationData?.companyDetails?.name || localise('lprns:notAvailable')

  rows.push(
    {
      key: { text: localise('lprns:issuerLabel') },
      value: { text: issuedBy }
    },
    {
      key: { text: localise('lprns:issuedDateLabel') },
      value: { text: issuedDate }
    },
    {
      key: { text: localise('lprns:issuedByLabel') },
      value: { text: issuedBy }
    },
    {
      key: { text: localise('lprns:authorisedByLabel') },
      value: { text: prn.authorisedBy?.name || '' }
    },
    {
      key: { text: localise('lprns:positionLabel') },
      value: { text: prn.authorisedBy?.position || '' }
    },
    {
      key: { text: localise('lprns:issuerNotesLabel') },
      value: { text: prn.notes || localise('lprns:notProvided') }
    }
  )

  return rows
}

/**
 * Builds the accreditation details rows for the summary list
 * @param {object} params
 * @param {object} params.registration - Registration data
 * @param {object} params.accreditation - Accreditation data
 * @param {string} params.displayMaterial - Formatted material name
 * @param {(key: string) => string} params.localise - Translation function
 * @param {boolean} params.isExporter - Whether the registration is for an exporter
 * @returns {Array} Summary list rows
 */
function buildAccreditationRows({
  registration,
  accreditation,
  displayMaterial,
  localise,
  isExporter
}) {
  const rows = [
    {
      key: { text: localise('lprns:materialLabel') },
      value: { text: displayMaterial }
    },
    {
      key: { text: localise('lprns:accreditationNumberLabel') },
      value: { text: accreditation?.accreditationNumber || '' }
    }
  ]

  if (!isExporter) {
    rows.push({
      key: { text: localise('lprns:accreditationAddressLabel') },
      value: { text: formatAddress(registration.site?.address) }
    })
  }

  return rows
}

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

const TAG_CLASS_BLUE = 'govuk-tag--blue epr-tag--no-max-width'
const TAG_CLASS_GREY = 'govuk-tag--grey epr-tag--no-max-width'
const TAG_CLASS_DEFAULT = 'epr-tag--no-max-width'

/**
 * Get status display configuration
 * @param {string} status
 * @param {(key: string) => string} localise
 * @returns {{text: string, class: string}}
 */
function getStatusConfig(status, localise) {
  const statusMap = {
    awaiting_authorisation: {
      text: localise('lprns:list:status:awaitingAuthorisation'),
      class: TAG_CLASS_BLUE
    },
    awaiting_acceptance: {
      text: localise('lprns:list:status:awaitingAcceptance'),
      class: TAG_CLASS_BLUE
    },
    issued: {
      text: localise('lprns:list:status:issued'),
      class: TAG_CLASS_BLUE
    },
    cancelled: {
      text: localise('lprns:list:status:cancelled'),
      class: TAG_CLASS_GREY
    }
  }

  return statusMap[status] ?? { text: status, class: TAG_CLASS_DEFAULT }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
