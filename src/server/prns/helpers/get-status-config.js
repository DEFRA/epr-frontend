import { prnStatuses } from '#server/common/constants/statuses.js'

/**
 * @import { PrnStatus } from '#server/common/constants/statuses.js'
 */

const TAG_CLASS_YELLOW = 'govuk-tag--yellow epr-tag--no-max-width'
const TAG_CLASS_PURPLE = 'govuk-tag--purple epr-tag--no-max-width'
const TAG_CLASS_BLUE = 'govuk-tag--blue epr-tag--no-max-width'
const TAG_CLASS_GREEN = 'govuk-tag--green epr-tag--no-max-width'
const TAG_CLASS_RED = 'govuk-tag--red epr-tag--no-max-width'
const TAG_CLASS_DEFAULT = 'epr-tag--no-max-width'

/**
 * Get status display configuration
 * @param {PrnStatus} status
 * @param {(key: string) => string} localise
 * @returns {{text: string, class: string}}
 */
function getStatusConfig(status, localise) {
  const statusMap = {
    [prnStatuses.awaitingAuthorisation]: {
      text: localise('prns:list:status:awaitingAuthorisation'),
      class: TAG_CLASS_BLUE
    },
    [prnStatuses.awaitingAcceptance]: {
      text: localise('prns:list:status:awaitingAcceptance'),
      class: TAG_CLASS_PURPLE
    },
    [prnStatuses.awaitingCancellation]: {
      text: localise('prns:list:status:awaitingCancellation'),
      class: TAG_CLASS_YELLOW
    },
    [prnStatuses.accepted]: {
      text: localise('prns:list:status:accepted'),
      class: TAG_CLASS_GREEN
    },
    [prnStatuses.cancelled]: {
      text: localise('prns:list:status:cancelled'),
      class: TAG_CLASS_RED
    }
  }

  return statusMap[status] ?? { text: status, class: TAG_CLASS_DEFAULT }
}

export { getStatusConfig }
