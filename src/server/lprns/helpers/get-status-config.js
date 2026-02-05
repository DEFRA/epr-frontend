const TAG_CLASS_BLUE = 'govuk-tag--blue epr-tag--no-max-width'
const TAG_CLASS_GREY = 'govuk-tag--grey epr-tag--no-max-width'
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
      class: TAG_CLASS_BLUE
    },
    issued: {
      text: localise('lprns:list:status:issued'),
      class: TAG_CLASS_BLUE
    },
    cancelled: {
      text: localise('lprns:list:status:cancelled'),
      class: TAG_CLASS_GREY
    }
  }

  return statusMap[status] ?? { text: status, class: TAG_CLASS_DEFAULT }
}

export { getStatusConfig }
