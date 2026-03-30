import Boom from '@hapi/boom'
import Joi from 'joi'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { CADENCE } from '../constants.js'
import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import { formatPeriodLabel } from '../helpers/format-period-label.js'
import { periodParamsSchema } from '../helpers/period-params-schema.js'
import { updateReport } from '../helpers/update-report.js'

const payloadSchema = Joi.object({
  freePernTonnage: Joi.number().min(0).required().messages({
    'any.required': 'reports:freePernErrorRequired',
    'number.base': 'reports:freePernErrorRequired',
    'number.min': 'reports:freePernErrorFormat',
    'number.unsafe': 'reports:freePernErrorFormat'
  }),
  action: Joi.string().valid('continue', 'save').required(),
  crumb: Joi.string()
})

/**
 * @param {Request} request
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {object} [options]
 * @param {string} [options.value] - Pre-fill value for tonnage input
 * @param {object} [options.errors] - Validation errors
 * @param {object} [options.errorSummary] - Error summary for govukErrorSummary
 */
async function buildViewData(
  request,
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  options = {}
) {
  const session = request.auth.credentials
  const { t: localise } = request

  const [{ registration, accreditation }, reportDetail] = await Promise.all([
    fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.idToken
    ),
    fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      session.idToken
    )
  ])

  if (
    !accreditation ||
    !isExporterRegistration(registration) ||
    cadence !== CADENCE.MONTHLY
  ) {
    throw Boom.notFound()
  }

  if (!reportDetail.id || reportDetail.status !== 'in_progress') {
    throw Boom.notFound()
  }

  if (!reportDetail.prn) {
    throw Boom.badImplementation('PRN data missing for accredited report')
  }

  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

  return {
    pageTitle: localise('reports:freePernPageTitle', {
      material,
      periodLabel
    }),
    caption: localise('reports:freePernCaption'),
    heading: localise('reports:freePernHeading', { periodLabel }),
    hintText: localise('reports:freePernHint'),
    backUrl: request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/prn-summary`
    ),
    deleteUrl: request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/delete`
    ),
    tonnageIssued: reportDetail.prn.tonnageIssued,
    value: options.value ?? reportDetail.prn.freeTonnage ?? '',
    errors: options.errors ?? null,
    errorSummary: options.errorSummary ?? null
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const freePernGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params

    const viewData = await buildViewData(
      request,
      organisationId,
      registrationId,
      year,
      cadence,
      period
    )

    return h.view('reports/exporter/free-perns', viewData)
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const freePernPostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: payloadSchema,
      async failAction(request, h, error) {
        const { organisationId, registrationId, year, cadence, period } =
          request.params

        const errors = {}
        const errorList = []

        for (const detail of error.details) {
          const field = detail.path[0]
          const message = request.t(detail.message)
          errors[field] = { text: message }
          errorList.push({ text: message, href: `#${field}` })
        }

        const viewData = await buildViewData(
          request,
          organisationId,
          registrationId,
          year,
          cadence,
          period,
          {
            value: request.payload.freePernTonnage,
            errors,
            errorSummary: {
              titleText: request.t('common:errorSummaryTitle'),
              errorList
            }
          }
        )

        return h.view('reports/exporter/free-perns', viewData).takeover()
      }
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const { freePernTonnage, action } = request.payload
    const session = request.auth.credentials

    const reportDetail = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      session.idToken
    )

    const tonnageIssued = reportDetail.prn.tonnageIssued

    if (freePernTonnage > tonnageIssued) {
      const { t: localise } = request
      const message = localise('reports:freePernErrorExceedsTotal')

      const viewData = await buildViewData(
        request,
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        {
          value: freePernTonnage,
          errors: {
            freePernTonnage: { text: message }
          },
          errorSummary: {
            titleText: localise('common:errorSummaryTitle'),
            errorList: [{ text: message, href: '#freePernTonnage' }]
          }
        }
      )

      return h.view('reports/exporter/free-perns', viewData)
    }

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { freePernTonnage },
      session.idToken
    )

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports`

    if (action === 'continue') {
      return h.redirect(
        request.localiseUrl(
          `${basePath}/${year}/${cadence}/${period}/supporting-information`
        )
      )
    }

    return h.redirect(request.localiseUrl(basePath))
  }
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
