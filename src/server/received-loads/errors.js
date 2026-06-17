const ERROR_SUMMARY_TITLE = 'There is a problem'

/**
 * @typedef {{ errors: Record<string, { text: string }>, errorSummary: { titleText: string, errorList: { text: string, href: string }[] } }} RenderableErrors
 */

/**
 * Builds the GOV.UK error summary and inline field errors from a flat list of
 * field/message pairs. The summary link anchors to the field id, unless an
 * override is supplied (used where the visible input id differs from the field
 * name, e.g. a date input whose first part is the day).
 *
 * @param {{ field: string, message: string }[]} list
 * @param {Record<string, string>} [anchorOverrides]
 * @returns {RenderableErrors}
 */
export const buildErrorView = (list, anchorOverrides = {}) => {
  /** @type {Record<string, { text: string }>} */
  const errors = {}
  /** @type {{ text: string, href: string }[]} */
  const errorList = []

  for (const { field, message } of list) {
    if (errors[field]) {
      continue
    }
    errors[field] = { text: message }
    errorList.push({ text: message, href: `#${anchorOverrides[field] ?? field}` })
  }

  return {
    errors,
    errorSummary: { titleText: ERROR_SUMMARY_TITLE, errorList }
  }
}

/**
 * Flattens a Joi validation error into field/message pairs, keeping the first
 * message per field.
 *
 * @param {import('joi').ValidationError} error
 * @returns {{ field: string, message: string }[]}
 */
export const joiErrorList = (error) =>
  error.details.map((detail) => ({
    field: String(detail.path[0] ?? detail.context?.key ?? '_form'),
    message: detail.message
  }))
