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
