/**
 * Builds validation error objects from Joi error details, suitable for
 * govukErrorSummary and inline error display.
 * @param {Request} request
 * @param {import('joi').ValidationError} error
 * @returns {{ errors: Record<string, { text: string }>, errorSummary: { titleText: string, errorList: Array<{ text: string, href: string }> } }}
 */
export function buildValidationErrors(request, error) {
  const errors = {}
  const errorList = []

  for (const detail of error.details) {
    const field = detail.path[0]
    const message = request.t(detail.message)
    errors[field] = { text: message }
    errorList.push({ text: message, href: `#${field}` })
  }

  return {
    errors,
    errorSummary: {
      titleText: request.t('common:errorSummaryTitle'),
      errorList
    }
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
