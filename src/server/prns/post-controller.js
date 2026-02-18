import { getYear } from 'date-fns'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getWasteBalance } from '#server/common/helpers/waste-balance/get-waste-balance.js'
import { getDisplayName } from '#server/common/helpers/waste-organisations/get-display-name.js'
import { mapToSelectOptions } from '#server/common/helpers/waste-organisations/map-to-select-options.js'
import { warnOnMissingRegistrations } from '#server/common/helpers/waste-organisations/warn-on-missing-registrations.js'
import Boom from '@hapi/boom'
import Joi from 'joi'
import { NOTES_MAX_LENGTH } from './constants.js'
import { createPrn } from './helpers/create-prn.js'
import { tonnageToWords } from './helpers/tonnage-to-words.js'
import { buildCreatePrnViewData } from './view-data.js'

const MIN_TONNAGE = 1

const ERROR_KEYS = Object.freeze({
  notesTooLong: 'notesTooLong',
  recipientInvalid: 'recipientInvalid',
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
    'string.empty': 'Enter a packaging producer or compliance scheme',
    'any.required': 'Enter a packaging producer or compliance scheme'
  }),
  notes: Joi.string()
    .max(NOTES_MAX_LENGTH)
    .allow('')
    .optional()
    .messages({
      'string.max': `Notes must be ${NOTES_MAX_LENGTH} characters or fewer`
    }),
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
    const message = localise(`prns:errors:${messageKey}`, { noteType })

    errors[field] = { text: message }
    errorList.push({ text: message, href: `#${field}` })
  }

  return {
    errors,
    errorSummary: {
      title: localise('prns:errorSummaryTitle'),
      list: errorList
    }
  }
}

/**
 * @param {object} result - The created PRN draft from the backend
 * @param {string} recipientDisplayName - The resolved display name for the recipient
 * @param {string} notes - Issuer notes
 */
function buildPrnDraftSession(result, recipientDisplayName, notes) {
  return {
    id: result.id,
    tonnage: result.tonnage,
    tonnageInWords: tonnageToWords(result.tonnage),
    material: result.material,
    status: result.status,
    recipientName: recipientDisplayName,
    notes: notes || '',
    wasteProcessingType: result.wasteProcessingType,
    processToBeUsed: result.processToBeUsed,
    isDecemberWaste: result.isDecemberWaste ?? false
  }
}

/**
 * Re-render the create form when the selected recipient is not
 * found in the organisations list.
 */
async function handleInvalidRecipient(request, h, organisations, year) {
  const { organisationId, registrationId, accreditationId } = request.params
  const session = request.auth.credentials
  const { t: localise } = request

  const noteType = getNoteType(request.payload.wasteProcessingType)
  const message = localise(`prns:errors:${ERROR_KEYS.recipientInvalid}`, {
    noteType
  })

  const errors = { recipient: { text: message } }
  const errorSummary = {
    title: localise('prns:errorSummaryTitle'),
    list: [{ text: message, href: '#recipient' }]
  }

  const [{ registration }, wasteBalance] = await Promise.all([
    fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.idToken
    ),
    getWasteBalance(
      organisationId,
      accreditationId,
      session.idToken,
      request.logger
    )
  ])

  const viewData = buildCreatePrnViewData(request, {
    organisationId,
    recipients: mapToSelectOptions(organisations, year),
    registration,
    registrationId,
    wasteBalance
  })

  return h.view('prns/create', {
    ...viewData,
    errors,
    errorSummary,
    formValues: request.payload
  })
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const postController = {
  options: {
    validate: {
      payload: payloadSchema,
      failAction: async (request, h, error) => {
        if (!config.get('featureFlags.prns')) {
          throw Boom.notFound()
        }

        const { organisationId, registrationId, accreditationId } =
          request.params
        const session = request.auth.credentials

        const { t: localise } = request
        const { errors, errorSummary } = buildValidationErrors(
          error,
          localise,
          request.payload.wasteProcessingType
        )

        const [{ registration }, { organisations }, wasteBalance] =
          await Promise.all([
            fetchRegistrationAndAccreditation(
              organisationId,
              registrationId,
              session.idToken
            ),
            request.wasteOrganisationsService.getOrganisations(),
            getWasteBalance(
              organisationId,
              accreditationId,
              session.idToken,
              request.logger
            )
          ])

        // TODO: should this use the accreditation year instead of current year?
        const currentYear = getYear(new Date())
        warnOnMissingRegistrations(organisations, request.logger)

        const viewData = buildCreatePrnViewData(request, {
          organisationId,
          recipients: mapToSelectOptions(organisations, currentYear),
          registration,
          registrationId,
          wasteBalance
        })

        return h
          .view('prns/create', {
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
    if (!config.get('featureFlags.prns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId } = request.params
    const session = request.auth.credentials
    const { tonnage, recipient, notes } = request.payload

    const { organisations } =
      await request.wasteOrganisationsService.getOrganisations()

    // TODO: should this use the accreditation year instead of current year?
    const currentYear = getYear(new Date())
    warnOnMissingRegistrations(organisations, request.logger)

    const organisation = organisations.find((org) => org.id === recipient)

    if (!organisation) {
      return handleInvalidRecipient(request, h, organisations, currentYear)
    }

    const issuedToOrganisation = {
      id: organisation.id,
      name: organisation.name,
      tradingName: organisation.tradingName
    }
    const recipientDisplayName = getDisplayName(organisation, currentYear)

    try {
      // Create PRN as draft in backend
      const result = await createPrn(
        organisationId,
        registrationId,
        accreditationId,
        {
          issuedToOrganisation,
          tonnage: Number.parseInt(tonnage, 10),
          notes: notes || undefined
        },
        session.idToken
      )

      // Store PRN data in session for check/confirm page
      request.yar.set(
        'prnDraft',
        buildPrnDraftSession(result, recipientDisplayName, notes)
      )

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
