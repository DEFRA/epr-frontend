// Stub recipients until real API is available
export const STUB_RECIPIENTS = [
  { value: 'producer-1', text: 'Acme Packaging Ltd' },
  { value: 'producer-2', text: 'BigCo Waste Solutions' },
  { value: 'producer-3', text: 'EcoRecycle Industries' },
  { value: 'scheme-1', text: 'Green Compliance Scheme' },
  { value: 'scheme-2', text: 'National Packaging Scheme' }
]

/**
 * Get recipient display name from either an object or string ID
 * @param {string | {id: string, name: string, tradingName?: string}} recipient - The recipient (object or ID string)
 * @returns {string} The display name
 */
export function getRecipientDisplayName(recipient) {
  // Handle new object format from backend
  if (recipient && typeof recipient === 'object') {
    return recipient.tradingName || recipient.name || recipient.id
  }

  // Handle legacy string ID format - look up from stub list
  const found = STUB_RECIPIENTS.find((r) => r.value === recipient)
  return found?.text ?? recipient
}
