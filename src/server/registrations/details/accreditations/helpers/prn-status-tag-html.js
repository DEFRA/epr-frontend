import { escapeHtml } from '#server/common/helpers/escape-html.js'
import { getStatusConfig } from '#server/prns/helpers/get-status-config.js'

/**
 * A note's status as a GDS tag. Labels come from the `prns` namespace, so a
 * status reads the same on these pages as on the operator's.
 * @param {string} status
 * @param {Localise} localise
 * @returns {string}
 */
export const buildPrnStatusTagHtml = (status, localise) => {
  const { text, class: tagClass } = getStatusConfig(status, localise)

  return `<strong class="govuk-tag ${tagClass}">${escapeHtml(text)}</strong>`
}

/**
 * @import { Localise } from '../../helpers/types.js'
 */
