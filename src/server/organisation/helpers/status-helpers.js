/**
 * Maps status to GOV.UK tag color class
 * @param {string} status - The status value
 * @returns {string} The GOV.UK tag color class
 */
export function getStatusClass(status) {
  const statusMap = {
    created: 'blue',
    approved: 'green',
    rejected: 'orange',
    cancelled: 'red',
    suspended: 'yellow',
    archived: 'grey'
  }

  return statusMap[status.toLowerCase()] || 'grey'
}

/**
 * Gets the current status from statusHistory
 * @param {Array} statusHistory - Array of status history objects
 * @returns {string} The current status
 */
export function getCurrentStatus(statusHistory) {
  if (!statusHistory || statusHistory.length === 0) {
    return 'Unknown'
  }
  const latestStatus = statusHistory.at(statusHistory.length - 1)
  return (
    latestStatus.status.charAt(0).toUpperCase() + latestStatus.status.slice(1)
  )
}
