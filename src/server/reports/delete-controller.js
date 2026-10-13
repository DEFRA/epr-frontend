import Joi from 'joi'

import { fetchRegistrationAndAccreditationByNumber } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getRegistrationMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
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
  const fallback = request.localiseUrl(reportsListPath(request.params))

  const { referrer } = request.info
  if (!referrer) {
    return fallback
  }

  let refererUrl
  try {
    refererUrl = new URL(referrer)
  } catch {
    return fallback
  }

  if (refererUrl.host !== request.info.host) {
    return fallback
  }

  if (refererUrl.pathname === request.path) {
    return fallback
  }

  return refererUrl.pathname + refererUrl.search
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

    const { registration } = await fetchRegistrationAndAccreditationByNumber(
      organisationNumber,
      registrationNumber,
      session
    )

    const material = getRegistrationMaterialDisplayName(registration)
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
