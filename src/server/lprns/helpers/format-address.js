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

export { formatAddress }
