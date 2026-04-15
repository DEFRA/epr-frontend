import Joi from 'joi'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { deleteReport } from './helpers/delete-report.js'

const payloadSchema = Joi.object({
  crumb: Joi.string()
})

/**
 * @param {HapiRequest} request
 */
function resolveBackUrl(request) {
  const { organisationId, registrationId } = request.params
  const fallback = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registrationId}/reports`
  )

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

/**
 * @satisfies {Partial<ServerRoute>}
 */
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
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const { registration } = await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.idToken
    )

    const material = getDisplayMaterial(registration)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

    const viewData = {
      pageTitle: localise('reports:deletePageTitle', { material, periodLabel }),
      heading: localise('reports:deleteHeading'),
      bodyWarning: localise('reports:deleteBodyWarning'),
      bodyGuidance: localise('reports:deleteBodyGuidance'),
      confirmButtonText: localise('reports:deleteConfirmButton'),
      backUrl: resolveBackUrl(request)
    }

    return h.view('reports/confirm-delete', viewData)
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
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
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const session = request.auth.credentials

    await deleteReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      session.idToken
    )

    return h.redirect(
      request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports`
      )
    )
  }
}

/**
 * @import { ServerRoute, ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
