import { cssClasses } from '#server/common/constants/css-classes.js'
import { getPrnType } from './helpers/get-note-type.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { getRecoveryCode } from './helpers/get-recovery-code.js'
import { tonnageToWords } from './helpers/tonnage-to-words.js'

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
function buildPrnDetails(localise, prnData, accreditation) {
  return [
    summaryRow(localise('recipient'), prnData.issuedToOrganisation ?? ''),
    summaryRow(localise('tonnage'), prnData.tonnageValue ?? ''),
    summaryRow(
      localise('tonnageInWords'),
      prnData.tonnageValue == null ? '' : tonnageToWords(prnData.tonnageValue)
    ),
    summaryRow(
      localise('processToBeUsed'),
      getRecoveryCode(accreditation?.material)
    ),
    summaryRow(localise('decemberWaste'), prnData.isDecemberWaste ?? ''),
    summaryRow(localise('issuer'), prnData.issuedByOrganisation ?? ''),
    summaryRow(localise('issuedDate'), prnData.issuedDate ?? ''),
    summaryRow(localise('issuedBy'), prnData.authorisedBy ?? ''),
    summaryRow(localise('position'), prnData.position ?? ''),
    summaryRow(
      localise('issuerNotes'),
      prnData.issuerNotes || localise('notProvided')
    )
  ]
}

/**
 * @param {(key: string) => string} localise
 * @param {object} [accreditation]
 * @returns {object[]}
 */
function buildAccreditationDetails(localise, accreditation) {
  const displayMaterial = accreditation?.material
    ? getDisplayMaterial(accreditation)
    : ''
  return [
    summaryRow(localise('material'), displayMaterial),
    summaryRow(
      localise('accreditationNumber'),
      accreditation?.accreditationNumber ?? ''
    ),
    summaryRow(
      localise('accreditationAddress'),
      accreditation?.siteAddress ?? ''
    )
  ]
}

/**
 * Build view data for the check PRN/PERN details page
 * @param {Request} request
 * @param {object} options
 * @param {{wasteProcessingType: string}} options.registration
 * @param {object} options.accreditation
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {object} options.prnData
 * @returns {object}
 */
export function buildCheckDetailsViewData(
  request,
  { registration, accreditation, organisationId, registrationId, prnData = {} }
) {
  const localise = (key) => request.t(`prns:checkDetails:${key}`)
  const prnType = getPrnType(registration)

  const pageTitle = localise(`${prnType}:pageTitle`)
  const createPrnUrl = `/organisations/${organisationId}/registrations/${registrationId}/create-prn`

  return {
    pageTitle,
    heading: pageTitle,
    leadParagraph: localise(`${prnType}:leadParagraph`),
    insetText: localise(`${prnType}:insetText`),
    prnDetailsHeading: localise(`${prnType}:detailsHeading`),
    prnDetails: buildPrnDetails(localise, prnData, accreditation),
    accreditationDetailsHeading: localise('accreditationDetailsHeading'),
    accreditationDetails: buildAccreditationDetails(localise, accreditation),
    backUrl: createPrnUrl,
    startAgainUrl: createPrnUrl,
    startAgainText: localise('startAgain')
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
