import Joi from 'joi'

import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { sameSiteReferrer } from '#server/common/helpers/same-site-referrer.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { reportAttempt } from './helpers/report-attempt.js'
import { reportsListPath } from './helpers/report-paths.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { deleteReport } from './helpers/delete-report.js'

const payloadSchema = Joi.object({
  crumb: Joi.string()
})

/**
 * @param {HapiRequest & { params: PeriodParams }} request
 */
function resolveBackUrl(request) {
  return (
    sameSiteReferrer(request) ??
    request.localiseUrl(reportsListPath(request.params))
  )
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const deleteGetController = {
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
    const { organisationNumber, registrationNumber, year, cadence, period } =
      request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const { registration } = await fetchRegistrationWithAccreditation(
      { organisationNumber, registrationNumber },
      session.backendToken
    )

    const material = getMaterialDisplayName(registration.material)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

    const viewData = {
      pageTitle: localise('reports:deletePageTitle', { material, periodLabel }),
      heading: localise('reports:deleteHeading'),
      bodyWarning: localise('reports:deleteBodyWarning'),
      bodyGuidance: localise('reports:deleteBodyGuidance'),
      confirmButtonText: localise('reports:deleteConfirmButton'),
      backUrl: resolveBackUrl(request)
    }

    await metrics.journey.start(
      request,
      JOURNEY.deleteReport,
      reportAttempt(request.params)
    )

    return h.view('reports/confirm-delete', viewData)
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const deletePostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: payloadSchema
    }
  },
  /**
   * @param {HapiRequest & { params: PeriodParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const session = request.auth.credentials

    await deleteReport(request.params, session.backendToken)

    await metrics.journey.end(
      request,
      JOURNEY.deleteReport,
      reportAttempt(request.params)
    )

    return h.redirect(request.localiseUrl(reportsListPath(request.params)))
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
