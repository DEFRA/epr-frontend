const TAG_CLASS_YELLOW = 'govuk-tag--yellow epr-tag--no-max-width'
const TAG_CLASS_PURPLE = 'govuk-tag--purple epr-tag--no-max-width'
const TAG_CLASS_BLUE = 'govuk-tag--blue epr-tag--no-max-width'
const TAG_CLASS_GREEN = 'govuk-tag--green epr-tag--no-max-width'
const TAG_CLASS_RED = 'govuk-tag--red epr-tag--no-max-width'
const TAG_CLASS_DEFAULT = 'epr-tag--no-max-width'

/**
 * Get status display configuration
 * @param {string} status
 * @param {(key: string) => string} localise
 * @returns {{text: string, class: string}}
 */
function getStatusConfig(status, localise) {
  const statusMap = {
    awaiting_authorisation: {
      text: localise('lprns:list:status:awaitingAuthorisation'),
      class: TAG_CLASS_BLUE
    },
    awaiting_acceptance: {
      text: localise('lprns:list:status:awaitingAcceptance'),
      class: TAG_CLASS_PURPLE
    },
    awaiting_cancellation: {
      text: localise('lprns:list:status:awaitingCancellation'),
      class: TAG_CLASS_YELLOW
    },
    accepted: {
      text: localise('lprns:list:status:accepted'),
      class: TAG_CLASS_GREEN
    },
    cancelled: {
      text: localise('lprns:list:status:cancelled'),
      class: TAG_CLASS_RED
    }
  }

  return statusMap[status] ?? { text: status, class: TAG_CLASS_DEFAULT }
}

export { getStatusConfig }
