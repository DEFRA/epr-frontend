import { siteLineOf } from '#server/common/helpers/organisations/site-name.js'

/**
 * @import { AccreditationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 */

/**
 * Builds the accreditation details rows for the summary list
 * @param {object} params
 * @param {RegistrationView} params.registration
 * @param {AccreditationView} params.accreditation
 * @param {string} params.displayMaterial - Formatted material name
 * @param {(key: string) => string} params.localise - Translation function
 * @returns {Array} Summary list rows
 */
function buildAccreditationRows({
  registration,
  accreditation,
  displayMaterial,
  localise
}) {
  const rows = [
    {
      key: { text: localise('prns:materialLabel') },
      value: { text: displayMaterial }
    },
    {
      key: { text: localise('prns:accreditationNumberLabel') },
      value: { text: accreditation.accreditationNumber }
    }
  ]

  const siteLine = siteLineOf(registration)

  if (siteLine !== null) {
    rows.push({
      key: { text: localise('prns:reprocessingSiteAddressLabel') },
      value: { text: siteLine }
    })
  }

  return rows
}

export { buildAccreditationRows }
