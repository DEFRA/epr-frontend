import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { mapToSelectOptions } from '#server/common/helpers/waste-organisations/map-to-select-options.js'
import Boom from '@hapi/boom'
import Joi from 'joi'
import { NOTES_MAX_LENGTH } from './constants.js'
import { createPrn } from './helpers/create-prn.js'
import { tonnageToWords } from './helpers/tonnage-to-words.js'
import { buildCreatePrnViewData } from './view-data.js'

const MIN_TONNAGE = 1

const ERROR_KEYS = Object.freeze({
  notesTooLong: 'notesTooLong',
  recipientRequired: 'recipientRequired',
  tonnageGreaterThanZero: 'tonnageGreaterThanZero',
  tonnageWholeNumber: 'tonnageWholeNumber'
})

const payloadSchema = Joi.object({
  tonnage: Joi.number().integer().min(MIN_TONNAGE).required().messages({
    'number.base': 'Enter a whole number',
    'number.integer': 'Enter a whole number without decimal places',
    'number.min': 'Tonnage must be at least 1',
    'any.required': 'Enter the tonnage'
  }),
  recipient: Joi.string().min(1).required().messages({
    'string.empty': 'Select who this will be issued to',
    'any.required': 'Select who this will be issued to'
  }),
  notes: Joi.string()
    .max(NOTES_MAX_LENGTH)
    .allow('')
    .optional()
    .messages({
      'string.max': `Notes must be ${NOTES_MAX_LENGTH} characters or fewer`
    }),
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

        const { organisations } =
          await request.wasteOrganisationsService.getOrganisations()

        const viewData = buildCreatePrnViewData(request, {
          registration,
          recipients: mapToSelectOptions(organisations)
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
    const { tonnage, recipient, notes, material } = request.payload

    const { organisations } =
      await request.wasteOrganisationsService.getOrganisations()

    const organisation = organisations.find((org) => org.id === recipient)
    const issuedToOrganisation = organisation
      ? {
          id: organisation.id,
          name: organisation.name,
          tradingName: organisation.tradingName
        }
      : { id: recipient, name: recipient, tradingName: null }

    try {
      // Create PRN as draft in backend
      const result = await createPrn(
        organisationId,
        registrationId,
        accreditationId,
        {
          issuedToOrganisation,
          tonnage: Number.parseInt(tonnage, 10),
          material,
          notes: notes || undefined
        },
        session.idToken
      )

      // Store PRN data in session for check/confirm page
      request.yar.set('prnDraft', {
        id: result.id,
        tonnage: result.tonnage,
        tonnageInWords: tonnageToWords(result.tonnage),
        material: result.material,
        status: result.status,
        recipientName: issuedToOrganisation.name,
        notes: notes || '',
        wasteProcessingType: result.wasteProcessingType,
        processToBeUsed: result.processToBeUsed,
        isDecemberWaste: result.isDecemberWaste ?? false
      })

      return h.redirect(
        `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${result.id}/view`
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
