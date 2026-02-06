import { tonnageToWords } from './tonnage-to-words.js'
import { formatDateForDisplay } from './format-date-for-display.js'

/**
 * Builds the status row for PRN details
 * @param {(key: string) => string} localise
 * @param {{text: string, class: string}} statusConfig
 * @returns {object}
 */
export function buildStatusRow(localise, statusConfig) {
  return {
    key: { text: localise('lprns:view:status') },
    value: {
      html: `<strong class="govuk-tag ${statusConfig.class}">${statusConfig.text}</strong>`
    }
  }
}

/**
 * Builds the core PRN rows (buyer, tonnage, process, december waste)
 * @param {object} prn
 * @param {(key: string) => string} localise
 * @param {string} recipientDisplayName
 * @returns {Array}
 */
export function buildPrnCoreRows(prn, localise, recipientDisplayName) {
  const decemberWasteText = prn.isDecemberWaste
    ? localise('lprns:decemberWasteYes')
    : localise('lprns:decemberWasteNo')
  const tonnageInWords = prn.tonnageInWords || tonnageToWords(prn.tonnage)

  return [
    {
      key: { text: localise('lprns:buyerLabel') },
      value: { text: recipientDisplayName }
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
  ]
}

/**
 * Builds the authorisation/issuer rows for PRN details
 * @param {object} prn
 * @param {object} organisationData
 * @param {(key: string) => string} localise
 * @param {object} [options]
 * @param {boolean} [options.includeIssuerRow] - Include the issuer row (for action page)
 * @returns {Array}
 */
export function buildPrnAuthorisationRows(
  prn,
  organisationData,
  localise,
  { includeIssuerRow = false } = {}
) {
  const issuedDate = prn.issuedAt ? formatDateForDisplay(prn.issuedAt) : ''
  const issuedBy =
    organisationData?.companyDetails?.name || localise('lprns:notAvailable')
  const notesText = prn.notes || localise('lprns:notProvided')

  const rows = []

  if (includeIssuerRow) {
    rows.push({
      key: { text: localise('lprns:issuerLabel') },
      value: { text: issuedBy }
    })
  }

  rows.push(
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
      value: { text: notesText }
    }
  )

  return rows
}
