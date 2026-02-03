/**
 * @import { ServerRoute } from '@hapi/hapi'
 */

import Joi from 'joi'

import { getRequiredRegistrationWithAccreditation } from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import { fetchWasteOrganisations } from '#server/common/helpers/waste-organisations/fetch-waste-organisations.js'
import { getNoteTypeDisplayNames } from '#server/prns/helpers/get-note-type.js'
import { NOTES_MAX_LENGTH } from './constants.js'
import { buildCreateViewData } from './view-data.js'

const FIELDS = Object.freeze({
  tonnage: 'tonnage',
  recipient: 'recipient',
  notes: 'notes'
})

const ERROR_KEYS = Object.freeze({
  notesTooLong: 'notesTooLong',
  recipientRequired: 'recipientRequired',
  tonnageGreaterThanZero: 'tonnageGreaterThanZero',
  tonnageWholeNumber: 'tonnageWholeNumber'
})

/**
 * @param {import('joi').ValidationErrorItem} detail
 * @returns {string}
 */
function getErrorMessageKey(detail) {
  const field = detail.path[0]

  if (field === FIELDS.tonnage) {
    if (detail.type === 'any.required' || detail.type === 'number.integer') {
      return ERROR_KEYS.tonnageWholeNumber
    }
    if (detail.type === 'number.base') {
      const value = detail.context?.value
      if (value === '' || value === undefined || value === null) {
        return ERROR_KEYS.tonnageWholeNumber
      }
      return ERROR_KEYS.tonnageGreaterThanZero
    }
    return ERROR_KEYS.tonnageGreaterThanZero
  }

  if (field === FIELDS.recipient) {
    return ERROR_KEYS.recipientRequired
  }

  return ERROR_KEYS.notesTooLong
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {{ wasteProcessingType: string }} registration
 * @param {import('joi').ValidationError} validationError
 * @returns {Record<string, {text: string}>}
 */
function buildValidationErrors(request, registration, validationError) {
  const errors = {}
  const details = validationError.details
  const { noteType } = getNoteTypeDisplayNames(registration)

  for (const detail of details) {
    const field = detail.path[0]
    const messageKey = getErrorMessageKey(detail)

    if (field === FIELDS.tonnage) {
      errors[field] = {
        text: request.t(`prns:create:errors:${messageKey}`, { noteType })
      }
    } else {
      errors[field] = {
        text: request.t(`prns:create:errors:${messageKey}`)
      }
    }
  }

  return errors
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
        const { organisationId, registrationId } = request.params
        const session = request.auth.credentials

        const { registration } = await getRequiredRegistrationWithAccreditation(
          organisationId,
          registrationId,
          session.idToken,
          request.logger
        )

        const { organisations } = await fetchWasteOrganisations()

        const errors = buildValidationErrors(request, registration, error)
        const payload = request.payload
        const values = {
          tonnage: payload.tonnage?.toString() ?? '',
          recipient: payload.recipient ?? '',
          notes: payload.notes ?? ''
        }

        const viewData = buildCreateViewData(request, {
          errors,
          organisationId,
          recipients: organisations,
          registration,
          registrationId,
          values
        })

        return h.view('prns/create-prn/create/create', viewData).takeover()
      }
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId } = request.params

    const placeholderPrnNumber = 'PRN-PLACEHOLDER-001'

    return h.redirect(
      `/organisations/${organisationId}/registrations/${registrationId}/create-prn/${placeholderPrnNumber}/check-details`
    )
  }
}
