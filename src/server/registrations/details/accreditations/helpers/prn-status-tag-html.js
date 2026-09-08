import { escapeHtml } from '#server/common/helpers/escape-html.js'
import { getStatusConfig } from '#server/prns/helpers/get-status-config.js'

/**
 * A note's status as a GDS tag.
 *
 * The labels come from `getStatusConfig`, which reads them out of the `prns`
 * namespace. These pages live under `registrations`, so this crosses a
 * namespace deliberately: a note's status should read the same wherever it
 * appears, and a second set of keys saying the same five things would drift.
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
