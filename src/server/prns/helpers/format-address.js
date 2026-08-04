/**
 * Formats an address object into a single line string
 * @param {{ line1?: string, line2?: string, town?: string, postcode?: string }} [address]
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
