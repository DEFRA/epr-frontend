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
    key: { text: localise('prns:view:status') },
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
    ? localise('prns:decemberWasteYes')
    : localise('prns:decemberWasteNo')
  const tonnageInWords = prn.tonnageInWords || tonnageToWords(prn.tonnage)

  return [
    {
      key: { text: localise('prns:issuedToLabel') },
      value: { text: recipientDisplayName }
    },
    {
      key: { text: localise('prns:tonnageLabel') },
      value: { text: String(prn.tonnage) }
    },
    {
      key: { text: localise('prns:tonnageInWordsLabel') },
      value: { text: tonnageInWords }
    },
    {
      key: { text: localise('prns:processToBeUsedLabel') },
      value: { text: prn.processToBeUsed || '' }
    },
    {
      key: { text: localise('prns:decemberWasteLabel') },
      value: { text: decemberWasteText }
    }
  ]
}

/**
 * Builds the issuer/issued-by rows for PRN details
 * @param {object} prn
 * @param {(key: string) => string} localise
 * @param {object} [options]
 * @param {string} [options.issuerName] - Organisation name for the issuer row
 * @returns {Array}
 */
export function buildPrnIssuerRows(prn, localise, { issuerName = '' } = {}) {
  const issuedDate = prn.issuedAt ? formatDateForDisplay(prn.issuedAt) : ''
  const notesText = prn.notes || localise('prns:notProvided')

  return [
    {
      key: { text: localise('prns:issuerLabel') },
      value: { text: issuerName }
    },
    {
      key: { text: localise('prns:issuedDateLabel') },
      value: { text: issuedDate }
    },
    {
      key: { text: localise('prns:issuedByLabel') },
      value: { text: prn.issuedBy?.name || '' }
    },
    {
      key: { text: localise('prns:positionLabel') },
      value: { text: prn.issuedBy?.position || '' }
    },
    {
      key: { text: localise('prns:issuerNotesLabel') },
      value: { text: notesText }
    }
  ]
}
