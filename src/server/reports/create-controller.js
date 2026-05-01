import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import {
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
import { CADENCE } from './constants.js'
import { createReport } from './helpers/create-report.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { validateCadenceForRegistration } from './helpers/validate-cadence.js'

export const createController = {
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

    const { registration, accreditation } =
      await fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      )

    validateCadenceForRegistration(cadence, accreditation)

    try {
      await createReport(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        session.idToken
      )
    } catch (error) {
      const isConflict =
        error.isBoom && error.output.statusCode === statusCodes.conflict

      if (!isConflict) {
        throw error
      }
    }

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}`

    const isExporter = isExporterRegistration(registration)
    const isReprocessor = isReprocessorRegistration(registration)

    const hasAccreditation = !!accreditation
    const isAccreditedExporter = hasAccreditation && isExporter
    const isRegisteredOnlyExporter = !hasAccreditation && isExporter

    let nextPage
    if (isAccreditedExporter && cadence === CADENCE.MONTHLY) {
      nextPage = `${basePath}/prn-summary`
    } else if (isReprocessor) {
      nextPage = `${basePath}/tonnes-recycled`
    } else if (isRegisteredOnlyExporter) {
      nextPage = `${basePath}/tonnes-not-exported`
    } else {
      nextPage = `${basePath}/supporting-information`
    }

    return h.redirect(request.localiseUrl(nextPage))
  }
}

/**
 * @import { ServerRoute, ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
