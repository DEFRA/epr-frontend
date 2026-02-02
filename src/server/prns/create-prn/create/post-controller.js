/**
 * @import { ServerRoute } from '@hapi/hapi'
 */

import Joi from 'joi'

import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { getPrnType } from '#server/prns/helpers/get-note-type.js'
import { NOTES_MAX_LENGTH } from './constants.js'
import { buildCreateViewData } from './view-data.js'

const FIELDS = Object.freeze({
  tonnage: 'tonnage',
  recipient: 'recipient',
  notes: 'notes'
})

const STUB_RECIPIENTS = [
  { value: 'producer-1', text: 'Acme Packaging Ltd' },
  { value: 'producer-2', text: 'BigCo Waste Solutions' },
  { value: 'producer-3', text: 'EcoRecycle Industries' },
  { value: 'scheme-1', text: 'Green Compliance Scheme' },
  { value: 'scheme-2', text: 'National Packaging Scheme' }
]

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {{wasteProcessingType: string}} registration
 * @returns {Record<string, {text: string}>}
 */
function buildValidationErrors(request, registration) {
  const errors = {}
  const details = request.pre.validationError.details
  const noteType = getPrnType(registration)

  for (const detail of details) {
    const field = detail.path[0]
    const messageKey = getErrorMessageKey(detail)

    if (field === FIELDS.tonnage) {
      errors[field] = {
        text: request.t(`prns:create:errors:${noteType}:${messageKey}`)
      }
    } else {
      errors[field] = {
        text: request.t(`prns:create:errors:${messageKey}`)
      }
    }
  }

  return errors
}

/**
 * @param {Joi.ValidationErrorItem} detail
 * @returns {string}
 */
function getErrorMessageKey(detail) {
  const field = detail.path[0]

  if (field === FIELDS.tonnage) {
    if (detail.type === 'any.required' || detail.type === 'number.integer') {
      return 'tonnageWholeNumber'
    }
    if (detail.type === 'number.base') {
      const value = detail.context?.value
      if (value === '' || value === undefined || value === null) {
        return 'tonnageWholeNumber'
      }
      return 'tonnageGreaterThanZero'
    }
    return 'tonnageGreaterThanZero'
  }

  if (field === FIELDS.recipient) {
    return 'recipientRequired'
  }

  return 'notesTooLong'
}

const payloadSchema = Joi.object({
  [FIELDS.tonnage]: Joi.number().integer().positive().required(),
  [FIELDS.recipient]: Joi.string().min(1).required(),
  [FIELDS.notes]: Joi.string().max(NOTES_MAX_LENGTH).allow('').optional()
})

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const postCreateController = {
  options: {
    validate: {
      payload: payloadSchema,
      failAction: async (request, h, error) => {
        request.pre.validationError = error
        return h.continue
      }
    },
    pre: [
      {
        method: async (request, h) => {
          if (request.pre.validationError) {
            const { organisationId, registrationId } = request.params
            const session = request.auth.credentials

            const { registration } =
              await getRequiredRegistrationWithAccreditation(
                organisationId,
                registrationId,
                session.idToken,
                request.logger
              )

            const errors = buildValidationErrors(request, registration)
            const payload = request.payload
            const values = {
              tonnage: payload.tonnage?.toString() ?? '',
              recipient: payload.recipient ?? '',
              notes: payload.notes ?? ''
            }

            const viewData = buildCreateViewData(request, {
              errors,
              organisationId,
              recipients: STUB_RECIPIENTS,
              registration,
              registrationId,
              values
            })

            return h.view('prns/create-prn/create/create', viewData).takeover()
          }
          return h.continue
        }
      }
    ]
  },
  async handler(request, h) {
    const { organisationId, registrationId } = request.params

    const placeholderPrnNumber = 'PRN-PLACEHOLDER-001'

    return h.redirect(
      `/organisations/${organisationId}/registrations/${registrationId}/create-prn/${placeholderPrnNumber}/check-details`
    )
  }
}
