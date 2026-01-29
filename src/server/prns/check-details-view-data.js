import { cssClasses } from '#server/common/constants/css-classes.js'
import { getNoteType } from './helpers/get-note-type.js'

/**
 * @param {string} label
 * @param {string} value
 * @returns {object}
 */
function summaryRow(label, value) {
  return {
    key: { text: label, classes: cssClasses.widthOneHalf },
    value: { text: value }
  }
}

/**
 * @param {(key: string) => string} localise
 * @param {object} prnData
 * @returns {object[]}
 */
function buildPrnDetails(localise, prnData) {
  const l = (key) => localise(`prns:checkDetails:${key}`)

  return [
    summaryRow(l('recipient'), prnData.recipient ?? ''),
    summaryRow(l('tonnage'), prnData.tonnage ?? ''),
    summaryRow(l('tonnageInWords'), prnData.tonnageInWords ?? ''),
    summaryRow(l('processToBeUsed'), prnData.processToBeUsed ?? ''),
    summaryRow(l('decemberWaste'), prnData.decemberWaste ?? ''),
    summaryRow(l('issuedDate'), prnData.issuedDate ?? ''),
    summaryRow(l('issuedBy'), prnData.issuedBy ?? ''),
    summaryRow(l('authorisedBy'), prnData.authorisedBy ?? ''),
    summaryRow(l('position'), prnData.position ?? ''),
    summaryRow(l('issuerNotes'), prnData.issuerNotes || l('notProvided'))
  ]
}

/**
 * @param {(key: string) => string} localise
 * @param {object} [accreditation]
 * @returns {object[]}
 */
function buildAccreditationDetails(localise, accreditation) {
  const l = (key) => localise(`prns:checkDetails:${key}`)

  return [
    summaryRow(l('material'), accreditation?.material ?? ''),
    summaryRow(
      l('accreditationNumber'),
      accreditation?.accreditationNumber ?? ''
    ),
    summaryRow(l('accreditationAddress'), accreditation?.address ?? '')
  ]
}

/**
 * Build view data for the check PRN/PERN details page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string}} options.registration
 * @param {object} options.accreditation
 * @param {object} options.prnData
 * @returns {object}
 */
export function buildCheckDetailsViewData(
  request,
  { registration, accreditation, prnData = {} }
) {
  const { t: localise } = request
  const noteType = getNoteType(registration)

  const pageTitle = localise(`prns:checkDetails:${noteType}:pageTitle`)

  return {
    pageTitle,
    heading: pageTitle,
    leadParagraph: localise(`prns:checkDetails:${noteType}:leadParagraph`),
    insetText: localise('prns:checkDetails:insetText'),
    prnDetailsHeading: localise(`prns:checkDetails:${noteType}:detailsHeading`),
    prnDetails: buildPrnDetails(localise, prnData),
    accreditationDetailsHeading: localise(
      'prns:checkDetails:accreditationDetailsHeading'
    ),
    accreditationDetails: buildAccreditationDetails(localise, accreditation)
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
