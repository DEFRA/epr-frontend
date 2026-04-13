import Joi from 'joi'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { updateReport } from './helpers/update-report.js'
import { buildValidationErrors } from './helpers/validation.js'

const MAX_SUPPORTING_INFO_LENGTH = 2000

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
 * @param {string} basePath
 * @param {object} registration
 * @param {object | null} accreditation
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

  const { wasteProcessingType } = registration
  const key = accreditation ? 'accredited' : 'unaccredited'
  return `${basePath}/${pages[wasteProcessingType][key]}`
}

/**
 * @param {Request} request
 * @param {object} [options]
 * @param {string} [options.value] - Pre-fill value for textarea
 * @param {object} [options.errors] - Validation errors
 * @param {object} [options.errorSummary] - Error summary for govukErrorSummary
 */
async function buildViewData(request, options = {}) {
  const { organisationId, registrationId, year, cadence, period } =
    request.params
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
    session.idToken
  )

  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

  const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}`

  const backPage = getBackPage(basePath, registration, accreditation)

  return {
    pageTitle: localise('reports:supportingInformationPageTitle', {
      material,
      periodLabel
    }),
    caption: localise('reports:supportingInformationCaption'),
    heading: localise('reports:supportingInformationHeading'),
    backUrl: request.localiseUrl(backPage),
    deleteUrl: request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/delete`
    ),
    maxLength: MAX_SUPPORTING_INFO_LENGTH,
    value: options.value ?? reportDetail.supportingInformation ?? '',
    errors: options.errors ?? null,
    errorSummary: options.errorSummary ?? null
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const supportingInformationGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const viewData = await buildViewData(request)

    return h.view('reports/supporting-information', viewData)
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const supportingInformationPostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: payloadSchema,
      async failAction(request, h, error) {
        const { errors, errorSummary } = buildValidationErrors(request, error)

        const viewData = await buildViewData(request, {
          value: request.payload.supportingInformation,
          errors,
          errorSummary
        })

        return h.view('reports/supporting-information', viewData).takeover()
      }
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const { supportingInformation, action } = request.payload
    const session = request.auth.credentials

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { supportingInformation },
      session.idToken
    )

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports`

    if (action === 'continue') {
      return h.redirect(
        request.localiseUrl(
          `${basePath}/${year}/${cadence}/${period}/check-your-answers`
        )
      )
    }

    return h.redirect(request.localiseUrl(basePath))
  }
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
