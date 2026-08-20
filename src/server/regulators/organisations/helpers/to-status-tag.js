import { ORGANISATION_STATUS } from '#domain/organisations/model.js'
import { cssClasses } from '#server/common/constants/css-classes.js'

/**
 * The tag one organisation status renders as.
 * @typedef {{ text: string, classes: string }} StatusTag
 */

/**
 * The colour each status wears. An organisation an operator has only applied
 * for reads as new, one a regulator has approved reads as settled, and one
 * that trades reads as live, so the colours run from blue through turquoise to
 * green. A refusal is red.
 * @type {Record<string, string>}
 */
const TAG_CLASSES = {
  [ORGANISATION_STATUS.CREATED]: cssClasses.tag.blue,
  [ORGANISATION_STATUS.APPROVED]: cssClasses.tag.turquoise,
  [ORGANISATION_STATUS.ACTIVE]: cssClasses.tag.green,
  [ORGANISATION_STATUS.REJECTED]: cssClasses.tag.red
}

/**
 * Projects an organisation status onto the tag the results table shows. The
 * backend can add a status without this repo hearing about it, so a status
 * this page does not know keeps its own name and wears grey. That tells the
 * regulator what the record says rather than leaving the cell empty.
 * @param {string} status
 * @param {(key: string) => string} localise
 * @returns {StatusTag}
 */
export const toStatusTag = (status, localise) => {
  const classes = TAG_CLASSES[status]

  return classes === undefined
    ? { text: status, classes: cssClasses.tag.grey }
    : { text: localise(`regulators:organisations:status:${status}`), classes }
}
