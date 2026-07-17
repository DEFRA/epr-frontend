import Joi from 'joi'

import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { isResubmission } from './helpers/resubmission.js'
import { updateReport } from './helpers/update-report.js'
import { buildValidationErrors } from './helpers/validation.js'

const MAX_SUPPORTING_INFO_LENGTH = 1000

const payloadSchema = Joi.object({
  supportingInformation: Joi.string()
    .max(MAX_SUPPORTING_INFO_LENGTH)
    .allow('')
    .optional()
    .default('')
    .messages({
      'string.max': 'reports:supportingInformationError'
    }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

/**
 * @typedef {{
 *   intro: string,
 *   examplesLead: string,
 *   examples: string[]
 * }} SupportingInfoInset
 */

/**
 * @typedef {{
 *   caption: string,
 *   heading: string,
 *   fieldLabel: string,
 *   hint: string,
 *   inset: SupportingInfoInset | null
 * }} SupportingInfoCopy
 */

/**
 * Resolves the copy for the supporting-information screen. The resubmission
 * variant (submissionNumber > 1, flag on) swaps the caption, heading, field
 * label and hint, and adds an inset listing common reasons. Both variants share
 * the same character limit.
 * @param {number} submissionNumber
 * @param {Registration} registration
 * @param {(key: string, params?: object) => string} localise
 * @returns {SupportingInfoCopy}
 */
function buildSupportingInfoCopy(submissionNumber, registration, localise) {
  if (!isResubmission(submissionNumber)) {
    return {
      caption: localise('reports:createDraftReportCaption'),
      heading: localise('reports:supportingInformationHeading'),
      fieldLabel: localise('reports:supportingInformationFieldLabel'),
      hint: localise('reports:supportingInformationHint'),
      inset: null
    }
  }

  const { noteType } = getNoteTypeDisplayNames(registration)

  return {
    caption: localise('reports:createDraftReportCaption'),
    heading: localise('reports:supportingInformationResubmissionHeading'),
    fieldLabel: localise('reports:supportingInformationResubmissionFieldLabel'),
    hint: localise('reports:supportingInformationResubmissionHint'),
    inset: {
      intro: localise('reports:supportingInformationResubmissionInsetIntro'),
      examplesLead: localise(
        'reports:supportingInformationResubmissionInsetExamplesLead'
      ),
      examples: [
        localise('reports:supportingInformationResubmissionInsetExample1'),
        localise('reports:supportingInformationResubmissionInsetExample2'),
        localise('reports:supportingInformationResubmissionInsetExample3', {
          noteType
        })
      ]
    }
  }
}

/**
 * Supporting-information form payload after Joi validation. `failAction`
 * runs before Joi coercion, so for failAction we narrow the pre-coerced
 * shape to the subset we read back.
 * @typedef {{
 *   supportingInformation: string,
 *   action: 'continue' | 'save',
 *   crumb?: string
 * }} SupportingInformationPayload
 */

/**
 * @typedef {HapiRequest & { params: PeriodParams, payload: SupportingInformationPayload }} SupportingInformationPostRequest
 */

/**
 * @param {string} basePath
 * @param {Registration} registration
 * @param {Accreditation | undefined} accreditation
 * @returns {string}
 */
function getBackPage(basePath, registration, accreditation) {
  const pages = {
    reprocessor: {
      unaccredited: 'tonnes-not-recycled',
      accredited: 'free-prns'
    },
    exporter: { unaccredited: 'tonnes-not-exported', accredited: 'free-perns' }
  }

  const wasteProcessingType = /** @type {keyof typeof pages} */ (
    registration.wasteProcessingType
  )
  const key = accreditation ? 'accredited' : 'unaccredited'
  return `${basePath}/${pages[wasteProcessingType][key]}`
}

/**
 * @typedef {SupportingInfoCopy & {
 *   pageTitle: string,
 *   backUrl: string,
 *   deleteUrl: string,
 *   maxLength: number,
 *   value: string,
 *   errors: object | null,
 *   errorSummary: object | null
 * }} SupportingInfoViewData
 */

/**
 * @param {HapiRequest & { params: PeriodParams }} request
 * @param {object} [options]
 * @param {string} [options.value] - Pre-fill value for textarea
 * @param {object} [options.errors] - Validation errors
 * @param {object} [options.errorSummary] - Error summary for govukErrorSummary
 * @returns {Promise<SupportingInfoViewData>}
 */
async function buildViewData(request, options = {}) {
  const {
    organisationId,
    registrationId,
    year,
    cadence,
    period,
    submissionNumber
  } = request.params
  const session = request.auth.credentials
  const { t: localise } = request

  const { registration, accreditation } =
    await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.idToken
    )

  const reportDetail = await fetchReportDetail(
    organisationId,
    registrationId,
    year,
    cadence,
    period,
    submissionNumber,
    session.idToken
  )

  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

  const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}`

  const backPage = getBackPage(basePath, registration, accreditation)

  const copy = buildSupportingInfoCopy(submissionNumber, registration, localise)

  return {
    pageTitle: localise('reports:supportingInformationPageTitle', {
      material,
      periodLabel
    }),
    caption: copy.caption,
    heading: copy.heading,
    fieldLabel: copy.fieldLabel,
    hint: copy.hint,
    inset: copy.inset,
    backUrl: request.localiseUrl(backPage),
    deleteUrl: request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}/delete`
    ),
    maxLength: MAX_SUPPORTING_INFO_LENGTH,
    value: options.value ?? reportDetail.supportingInformation ?? '',
    errors: options.errors ?? null,
    errorSummary: options.errorSummary ?? null
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const supportingInformationGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  /**
   * @param {HapiRequest & { params: PeriodParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const viewData = await buildViewData(request)

    return h.view('reports/supporting-information', viewData)
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const supportingInformationPostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: payloadSchema,
      /**
       * @param {SupportingInformationPostRequest} request
       * @param {ResponseToolkit} h
       * @param {Error | undefined} error Hapi's failAction contract — with
       *   payload validation configured this is always the Joi ValidationError.
       */
      async failAction(request, h, error) {
        const { errors, errorSummary } = buildValidationErrors(
          request,
          /** @type {Joi.ValidationError} */ (error)
        )

        const viewData = await buildViewData(request, {
          value: request.payload.supportingInformation,
          errors,
          errorSummary
        })

        return h.view('reports/supporting-information', viewData).takeover()
      }
    }
  },
  /**
   * @param {SupportingInformationPostRequest} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const {
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const { supportingInformation, action } = request.payload

    await updateReport(
      {
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        submissionNumber
      },
      { supportingInformation },
      request.auth.credentials.idToken
    )

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports`

    if (action === 'continue') {
      return h.redirect(
        request.localiseUrl(
          `${basePath}/${year}/${cadence}/${period}/submissions/${submissionNumber}/check-your-answers`
        )
      )
    }

    return h.redirect(request.localiseUrl(basePath))
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
