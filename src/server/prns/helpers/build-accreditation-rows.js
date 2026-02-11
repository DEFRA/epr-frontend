import { formatAddress } from './format-address.js'

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
      key: { text: localise('prns:materialLabel') },
      value: { text: displayMaterial }
    },
    {
      key: { text: localise('prns:accreditationNumberLabel') },
      value: { text: accreditation?.accreditationNumber || '' }
    }
  ]

  if (!isExporter) {
    rows.push({
      key: { text: localise('prns:reprocessingSiteAddressLabel') },
      value: { text: formatAddress(registration.site?.address) }
    })
  }

  return rows
}

export { buildAccreditationRows }
