import Boom from '@hapi/boom'
import Joi from 'joi'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { createPrn } from './helpers/create-prn.js'
import {
  STUB_RECIPIENTS,
  getRecipientDisplayName
} from './helpers/stub-recipients.js'
import { buildCreatePrnViewData } from './view-data.js'

const MIN_TONNAGE = 1
const MAX_NOTES_LENGTH = 200

const ERROR_KEYS = Object.freeze({
  notesTooLong: 'notesTooLong',
  recipientRequired: 'recipientRequired',
  tonnageGreaterThanZero: 'tonnageGreaterThanZero',
  tonnageWholeNumber: 'tonnageWholeNumber'
})

const payloadSchema = Joi.object({
  tonnage: Joi.number().integer().min(MIN_TONNAGE).required(),
  recipient: Joi.string().min(1).required(),
  notes: Joi.string().max(MAX_NOTES_LENGTH).allow('').optional(),
  material: Joi.string().required(),
  nation: Joi.string().required(),
  wasteProcessingType: Joi.string().required()
})

/**
 * @param {import('joi').ValidationErrorItem} detail
 * @returns {string}
 */
function getErrorMessageKey(detail) {
  const field = detail.path[0]

  if (field === 'tonnage') {
    if (detail.type === 'number.min') {
      return ERROR_KEYS.tonnageGreaterThanZero
    }
    return ERROR_KEYS.tonnageWholeNumber
  }

  if (field === 'recipient') {
    return ERROR_KEYS.recipientRequired
  }

  return ERROR_KEYS.notesTooLong
}

/**
 * @param {string} wasteProcessingType
 * @returns {string}
 */
function getNoteType(wasteProcessingType) {
  return wasteProcessingType === 'exporter' ? 'PERN' : 'PRN'
}

/**
 * Build error objects for form display
 * @param {Joi.ValidationError} validationError
 * @param {(key: string, params?: object) => string} localise
 * @param {string} wasteProcessingType
 * @returns {{errors: object, errorSummary: {title: string, list: Array}}}
 */
function buildValidationErrors(validationError, localise, wasteProcessingType) {
  const errors = {}
  const errorList = []
  const noteType = getNoteType(wasteProcessingType)

  for (const detail of validationError.details) {
    const field = detail.path[0]
    const messageKey = getErrorMessageKey(detail)
    const message = localise(`lprns:errors:${messageKey}`, { noteType })

    errors[field] = { text: message }
    errorList.push({ text: message, href: `#${field}` })
  }

  return {
    errors,
    errorSummary: {
      title: localise('lprns:errorSummaryTitle'),
      list: errorList
    }
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const postController = {
  options: {
    validate: {
      payload: payloadSchema,
      failAction: async (request, h, error) => {
        if (!config.get('featureFlags.lprns')) {
          throw Boom.notFound()
        }

        const { organisationId, registrationId } = request.params
        const session = request.auth.credentials

        const { registration } = await fetchRegistrationAndAccreditation(
          organisationId,
          registrationId,
          session.idToken
        )

        const { t: localise } = request
        const { errors, errorSummary } = buildValidationErrors(
          error,
          localise,
          registration.wasteProcessingType
        )

        const viewData = buildCreatePrnViewData(request, {
          registration,
          recipients: STUB_RECIPIENTS
        })

        return h
          .view('lprns/create', {
            ...viewData,
            errors,
            errorSummary,
            formValues: request.payload
          })
          .takeover()
      }
    }
  },
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId } = request.params
    const session = request.auth.credentials
    const { tonnage, recipient, notes, material, nation, wasteProcessingType } =
      request.payload

    // Find recipient name from stub list
    const recipientName = getRecipientDisplayName(recipient)

    try {
      // Create PRN as draft in backend
      const result = await createPrn(
        organisationId,
        registrationId,
        accreditationId,
        {
          issuedToOrganisation: recipient,
          tonnage: Number.parseInt(tonnage, 10),
          material,
          nation,
          wasteProcessingType,
          issuerNotes: notes || undefined
        },
        session.idToken
      )

      // Store PRN data in session for check/confirm page
      request.yar.set('prnDraft', {
        id: result.id,
        tonnage: result.tonnage,
        tonnageInWords: result.tonnageInWords,
        material: result.material,
        status: result.status,
        recipientName,
        notes: notes || '',
        wasteProcessingType,
        processToBeUsed: result.processToBeUsed,
        isDecemberWaste: result.isDecemberWaste ?? false
      })

      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/l-packaging-recycling-notes/${result.id}/view`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to create PRN draft')

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation('Failed to create PRN')
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
