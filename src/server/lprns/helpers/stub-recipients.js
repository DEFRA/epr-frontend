// Stub recipients until real API is available
export const STUB_RECIPIENTS = [
  { value: 'producer-1', text: 'Acme Packaging Ltd' },
  { value: 'producer-2', text: 'BigCo Waste Solutions' },
  { value: 'producer-3', text: 'EcoRecycle Industries' },
  { value: 'scheme-1', text: 'Green Compliance Scheme' },
  { value: 'scheme-2', text: 'National Packaging Scheme' }
]

/**
 * Look up recipient display name from stub list
 * @param {string} recipientId - The recipient ID stored in the PRN
 * @returns {string} The display name or the original ID if not found
 */
export function getRecipientDisplayName(recipientId) {
  const recipient = STUB_RECIPIENTS.find((r) => r.value === recipientId)
  return recipient?.text ?? recipientId
}
