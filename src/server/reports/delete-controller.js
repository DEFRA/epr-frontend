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
 * @satisfies {Partial<ServerRoute>}
 */
export const deleteGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
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
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/supporting-information`
      )
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
 * @import { ServerRoute } from '@hapi/hapi'
 */
