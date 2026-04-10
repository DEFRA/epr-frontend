import Boom from '@hapi/boom'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { CADENCE } from '../constants.js'
import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import { formatPeriodLabel } from '../helpers/format-period-label.js'

/**
 * Fetches registration/accreditation and report detail, then enforces the
 * accredited-exporter-monthly guard. Returns the validated data needed by
 * both prn-summary and free-perns pages.
 * @param {Request} request
 * @returns {Promise<{ registration: object, reportDetail: object }>}
 */
export async function fetchGuardedExporterData(request) {
  const { organisationId, registrationId, year, cadence, period } =
    request.params
  const session = request.auth.credentials

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

  const status = reportDetail.status?.currentStatus ?? reportDetail.status
  if (!reportDetail.id || status !== 'in_progress') {
    throw Boom.notFound()
  }

  if (!reportDetail.prn) {
    throw Boom.badImplementation('PRN data missing for accredited report')
  }

  return { registration, reportDetail }
}

/**
 * Fetches guarded exporter data and builds the common view data fields shared
 * by prn-summary and free-perns pages. Page-specific fields are merged from
 * the callback return value.
 * @param {Request} request
 * @param {(ctx: { registration: object, reportDetail: object, material: string, periodLabel: string, periodPath: string }) => object} buildPageFields
 * @param {object} [options]
 * @param {unknown} [options.value]
 * @param {object} [options.errors]
 * @param {object} [options.errorSummary]
 * @returns {Promise<object>}
 */
export async function buildExporterViewData(
  request,
  buildPageFields,
  options = {}
) {
  const { organisationId, registrationId, year, cadence, period } =
    request.params
  const { t: localise } = request

  const { registration, reportDetail } = await fetchGuardedExporterData(request)

  const material = getDisplayMaterial(registration).toLowerCase()
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
  const periodPath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}`

  const pageFields = buildPageFields({
    registration,
    reportDetail,
    material,
    periodLabel,
    periodPath
  })

  return {
    ...pageFields,
    deleteUrl: request.localiseUrl(`${periodPath}/delete`),
    value: options.value ?? pageFields.defaultValue ?? '',
    errors: options.errors ?? null,
    errorSummary: options.errorSummary ?? null
  }
}

/**
 * @import { Request } from '@hapi/hapi'
 */
