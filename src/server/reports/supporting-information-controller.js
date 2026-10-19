import Joi from 'joi'

import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { reportPath, reportsListPath } from './helpers/report-paths.js'
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
 * label and hint, and adds an inset listing common reasons. The note-type
 * example (a cancelled PRN/PERN) is only relevant to accredited operators;
 * registered-only operators have no notes, so it is omitted for them. Both
 * variants share the same character limit.
 * @param {number} submissionNumber
 * @param {RegistrationView} registration
 * @param {AccreditationView | undefined} accreditation
 * @param {Localise} localise
 * @returns {SupportingInfoCopy}
 */
function buildSupportingInfoCopy(
  submissionNumber,
  registration,
  accreditation,
  localise
) {
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
        ...(accreditation
          ? [
              localise(
                'reports:supportingInformationResubmissionInsetExample3',
                { noteType }
              )
            ]
          : [])
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
 * @param {RegistrationView} registration
 * @param {AccreditationView | undefined} accreditation
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
    organisationNumber,
    registrationNumber,
    year,
    cadence,
    period,
    submissionNumber
  } = request.params
  const session = request.auth.credentials
  const { t: localise } = request

  const { registration, accreditation } =
    await fetchRegistrationWithAccreditation(
      { organisationNumber, registrationNumber },
      session.backendToken
    )

  const reportDetail = await fetchReportDetail(
    request.params,
    session.backendToken
  )

  const material = getMaterialDisplayName(registration.material)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

  const basePath = reportPath(request.params)

  const backPage = getBackPage(basePath, registration, accreditation)

  const copy = buildSupportingInfoCopy(
    submissionNumber,
    registration,
    accreditation,
    localise
  )

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
    deleteUrl: request.localiseUrl(`${basePath}/delete`),
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
    const { supportingInformation, action } = request.payload

    await updateReport(
      request.params,
      { supportingInformation },
      request.auth.credentials.backendToken
    )

    if (action === 'continue') {
      return h.redirect(
        request.localiseUrl(`${reportPath(request.params)}/check-your-answers`)
      )
    }

    return h.redirect(request.localiseUrl(reportsListPath(request.params)))
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { AccreditationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { Localise } from './helpers/format-period-label.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
