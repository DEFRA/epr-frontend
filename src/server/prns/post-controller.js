import { fetchRequiredAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { getIssuedToOrgDisplayName } from '#server/common/helpers/waste-organisations/get-issued-to-org-display-name.js'
import { mapToSelectOptions } from '#server/common/helpers/waste-organisations/map-to-select-options.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { followingYear } from '#server/common/helpers/year.js'
import {
  badImplementation,
  classifierTail
} from '#server/common/helpers/logging/cdp-boom.js'
import Joi from 'joi'
import { NOTES_MAX_LENGTH } from './constants.js'
import {
  closedYearSendsTo,
  isClosedYearRefusal
} from './helpers/closed-year.js'
import { createPrn } from './helpers/create-prn.js'
import { fetchDecemberPrnEligibility } from './helpers/fetch-december-prn-eligibility.js'
import { toAccreditationKeys } from './helpers/fetch-prn-context.js'
import { fetchPrnWasteBalance } from './helpers/fetch-prn-waste-balance.js'
import { prnsPath } from './helpers/prn-resource.js'
import { recipientRegistrationYears } from './helpers/recipient-registration-years.js'
import { resolveDecemberWasteControl } from './helpers/resolve-december-waste-choice.js'
import { resolveInsufficientBalanceMessageKey } from './helpers/insufficient-balance-error.js'
import { tonnageToWords } from './helpers/tonnage-to-words.js'
import { buildCreatePrnViewData } from './view-data.js'

/** @import { ValidationErrorItem } from 'joi' */

const MIN_TONNAGE = 1

const CREATE_VIEW = 'prns/create'
const ERROR_SUMMARY_TITLE_KEY = 'prns:errorSummaryTitle'

// Contract shared with the backend: the create-draft route returns this code
// in the 409 body when the requested tonnage exceeds the available balance.
// The backend owns the rule; the frontend only renders its verdict. Until the
// backend emits this code the branch is inert, so behaviour degrades to the
// existing confirm-time check.
const INSUFFICIENT_BALANCE_CODE = 'INSUFFICIENT_AVAILABLE_BALANCE'

const ERROR_KEYS = Object.freeze(
  /** @type {const} */ ({
    notesTooLong: 'notesTooLong',
    recipientInvalid: 'recipientInvalid',
    recipientNotRegisteredForYear: 'recipientNotRegisteredForYear',
    recipientRequired: 'recipientRequired',
    tonnageGreaterThanZero: 'tonnageGreaterThanZero',
    tonnageWholeNumber: 'tonnageWholeNumber'
  })
)

/** @typedef {(typeof ERROR_KEYS)[keyof typeof ERROR_KEYS]} ErrorKey */

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
  wasteProcessingType: Joi.string().required(),
  isDecemberWaste: Joi.boolean().default(false)
})

/**
 * Create-PRN form payload after Joi validation. `tonnage` arrives as a
 * string from the form and is coerced to a number when calling createPrn.
 * `failAction` runs before Joi coercion too, so the typing on failAction's
 * payload is intentionally the unvalidated shape.
 * @typedef {{
 *   tonnage: string,
 *   recipient: string,
 *   notes?: string,
 *   wasteProcessingType: string,
 *   isDecemberWaste?: boolean
 * }} CreatePrnPayload
 */

/**
 * @param {ValidationErrorItem} detail
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
      title: localise(ERROR_SUMMARY_TITLE_KEY),
      list: errorList
    }
  }
}

/**
 * Fetches everything `buildCreatePrnViewData` needs to re-render the create
 * form, shared by the three re-render paths (insufficient balance, invalid
 * recipient, validation failAction) so they can't drift on which calls they
 * make.
 * @param {HapiRequest} request
 * @param {AccreditationKeys} keys
 * @param {DecemberPrnEligibility} decemberPrnEligibility
 * @returns {Promise<{ registration: RegistrationView, wasteBalance: WasteBalance | null, decemberWasteControl: DecemberWasteControl }>}
 */
async function fetchCreatePrnViewDataInputs(
  request,
  keys,
  decemberPrnEligibility
) {
  const { backendToken } = request.auth.credentials

  const { registration, accreditation } = await fetchRequiredAccreditation(
    keys,
    backendToken
  )

  const wasteBalance = await fetchPrnWasteBalance({
    keys,
    accreditationNumber: accreditation.accreditationNumber,
    backendToken,
    logger: request.logger
  })

  const { noteTypePlural } = getNoteTypeDisplayNames(registration)

  return {
    registration,
    wasteBalance,
    decemberWasteControl: resolveDecemberWasteControl(
      decemberPrnEligibility,
      request.t,
      noteTypePlural,
      wasteBalance
    )
  }
}

/**
 * The organisations a note can be issued to: those registered for the
 * accreditation year, and for the following year when the page asks about
 * December waste.
 * @param {HapiRequest} request
 * @param {AccreditationKeys} keys
 * @param {DecemberPrnEligibility} decemberPrnEligibility
 * @returns {Promise<{ organisations: WasteOrganisation[] }>}
 */
const fetchRecipientOrganisations = (request, keys, decemberPrnEligibility) =>
  request.wasteOrganisationsService.getOrganisations(
    recipientRegistrationYears(keys.year, decemberPrnEligibility)
  )

/**
 * Re-render the create form when the backend rejects draft creation because
 * the entered tonnage exceeds the available waste balance. The rejection
 * decision is the backend's; the frontend picks the message wording from
 * which pot the operator submitted, since the backend's 409 carries no pool
 * discriminator by design (ADR-0049).
 * @param {HapiRequest & { params: PrnListParams, payload: CreatePrnPayload }} request
 * @param {ResponseToolkit} h
 * @param {Array<WasteOrganisation>} organisations
 * @param {DecemberPrnEligibility} decemberPrnEligibility
 */
async function handleInsufficientBalance(
  request,
  h,
  organisations,
  decemberPrnEligibility
) {
  const keys = toAccreditationKeys(request.params)
  const { t: localise } = request

  const { registration, wasteBalance, decemberWasteControl } =
    await fetchCreatePrnViewDataInputs(request, keys, decemberPrnEligibility)

  const messageKey = resolveInsufficientBalanceMessageKey(
    decemberWasteControl.mode,
    request.payload.isDecemberWaste
  )
  const message = localise(messageKey)

  const errors = { tonnage: { text: message } }
  const errorSummary = {
    title: localise(ERROR_SUMMARY_TITLE_KEY),
    list: [{ text: message, href: '#tonnage' }]
  }

  const viewData = buildCreatePrnViewData(request, {
    keys,
    recipients: mapToSelectOptions(organisations),
    registration,
    wasteBalance,
    decemberWasteControl
  })

  return h.view(CREATE_VIEW, {
    ...viewData,
    errors,
    errorSummary,
    formValues: reRenderFormValues(request.payload)
  })
}

/**
 * `request.payload` here has already been through Joi, so `isDecemberWaste`
 * is a boolean while the radio items' values are the strings `'true'`/`'false'`
 * (see view-data.js). The govukRadios macro checks `item.value == params.value`,
 * and in Nunjucks `"true" == true` is false, so without this the previously
 * selected radio would never come back checked on re-render.
 * @param {CreatePrnPayload} payload
 */
function reRenderFormValues(payload) {
  return {
    ...payload,
    isDecemberWaste: String(payload.isDecemberWaste)
  }
}

/**
 * @param {PackagingRecyclingNote} result - The created PRN draft from the backend
 * @param {string} recipientDisplayName - The resolved display name for the recipient
 * @param {string | undefined} notes - Issuer notes
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
 * Re-render the create form with an error on the recipient: one not in the
 * organisations list, or one that cannot take this note.
 * @param {HapiRequest & { params: PrnListParams, payload: CreatePrnPayload }} request
 * @param {ResponseToolkit} h
 * @param {Array<WasteOrganisation>} organisations
 * @param {DecemberPrnEligibility} decemberPrnEligibility
 * @param {ErrorKey} errorKey
 */
async function handleRecipientError(
  request,
  h,
  organisations,
  decemberPrnEligibility,
  errorKey
) {
  const keys = toAccreditationKeys(request.params)
  const { t: localise } = request

  const noteType = getNoteType(request.payload.wasteProcessingType)
  const message = localise(`prns:errors:${errorKey}`, {
    noteType,
    year: keys.year,
    followingYear: followingYear(keys.year)
  })

  const errors = { recipient: { text: message } }
  const errorSummary = {
    title: localise(ERROR_SUMMARY_TITLE_KEY),
    list: [{ text: message, href: '#recipient' }]
  }

  const { registration, wasteBalance, decemberWasteControl } =
    await fetchCreatePrnViewDataInputs(request, keys, decemberPrnEligibility)

  const viewData = buildCreatePrnViewData(request, {
    keys,
    recipients: mapToSelectOptions(organisations),
    registration,
    wasteBalance,
    decemberWasteControl
  })

  return h.view(CREATE_VIEW, {
    ...viewData,
    errors,
    errorSummary,
    formValues: reRenderFormValues(request.payload)
  })
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const postController = {
  options: {
    validate: {
      payload: payloadSchema,
      /**
       * @param {HapiRequest & { params: PrnListParams, payload: CreatePrnPayload }} request
       * @param {ResponseToolkit} h
       * @param {Error | undefined} error Hapi's failAction contract — with
       *   payload validation configured this is always the Joi ValidationError.
       */
      failAction: async (request, h, error) => {
        const keys = toAccreditationKeys(request.params)
        const { t: localise } = request
        const { errors, errorSummary } = buildValidationErrors(
          /** @type {Joi.ValidationError} */ (error),
          localise,
          request.payload.wasteProcessingType
        )

        const decemberPrnEligibility = await fetchDecemberPrnEligibility(
          keys,
          request.auth.credentials.backendToken
        )
        const [
          { organisations },
          { registration, wasteBalance, decemberWasteControl }
        ] = await Promise.all([
          fetchRecipientOrganisations(request, keys, decemberPrnEligibility),
          fetchCreatePrnViewDataInputs(request, keys, decemberPrnEligibility)
        ])

        const viewData = buildCreatePrnViewData(request, {
          keys,
          recipients: mapToSelectOptions(organisations),
          registration,
          wasteBalance,
          decemberWasteControl
        })

        return h
          .view(CREATE_VIEW, {
            ...viewData,
            errors,
            errorSummary,
            formValues: request.payload
          })
          .takeover()
      }
    }
  },
  /**
   * @param {HapiRequest & { params: PrnListParams, payload: CreatePrnPayload }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const keys = toAccreditationKeys(request.params)
    const { backendToken } = request.auth.credentials
    const { tonnage, recipient, notes, isDecemberWaste } = request.payload

    const decemberPrnEligibility = await fetchDecemberPrnEligibility(
      keys,
      backendToken
    )
    const { organisations } = await fetchRecipientOrganisations(
      request,
      keys,
      decemberPrnEligibility
    )

    const organisation = organisations.find((org) => org.id === recipient)

    if (!organisation) {
      return handleRecipientError(
        request,
        h,
        organisations,
        decemberPrnEligibility,
        ERROR_KEYS.recipientInvalid
      )
    }

    if (
      !isDecemberWaste &&
      !organisation.registrationYears.includes(keys.year)
    ) {
      return handleRecipientError(
        request,
        h,
        organisations,
        decemberPrnEligibility,
        ERROR_KEYS.recipientNotRegisteredForYear
      )
    }

    const issuedToOrganisation = {
      id: organisation.id,
      name: organisation.name,
      tradingName: organisation.tradingName,
      ...(organisation.registrationType && {
        registrationType: organisation.registrationType
      })
    }
    const recipientDisplayName = getIssuedToOrgDisplayName(organisation)

    try {
      // Create PRN as draft in backend
      const result = await createPrn(
        keys,
        {
          issuedToOrganisation,
          tonnage: Number.parseInt(tonnage, 10),
          notes: notes || undefined,
          isDecemberWaste
        },
        backendToken
      )

      // Store PRN data in session for check/confirm page
      request.yar.set(
        'prnDraft',
        buildPrnDraftSession(result, recipientDisplayName, notes)
      )

      return h.redirect(`${prnsPath(keys)}/${result.id}/view`)
    } catch (error) {
      if (error.output?.payload?.code === INSUFFICIENT_BALANCE_CODE) {
        return handleInsufficientBalance(
          request,
          h,
          organisations,
          decemberPrnEligibility
        )
      }

      if (isClosedYearRefusal(error)) {
        return h.redirect(closedYearSendsTo.list(request.params))
      }

      if (error.isBoom) {
        throw error
      }

      throw badImplementation(
        'Failed to create PRN',
        errorCodes.prnCreateFailed,
        {
          event: {
            action: 'create_prn',
            reason: classifierTail(error)
          }
        }
      )
    }
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { WasteOrganisation } from '#server/common/helpers/waste-organisations/types.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 * @import { PackagingRecyclingNote } from './helpers/prn-resource.js'
 * @import { PrnListParams } from './helpers/session-types.js'
 * @import { DecemberWasteControl } from './helpers/resolve-december-waste-choice.js'
 * @import { DecemberPrnEligibility } from './helpers/fetch-december-prn-eligibility.js'
 */
