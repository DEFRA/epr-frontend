import Boom from '@hapi/boom'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { CADENCE } from '../constants.js'
import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import {
  formatPeriodLabel,
  formatPeriodShort
} from '../helpers/format-period-label.js'

/**
 * Fetches registration/accreditation and report detail, then enforces the
 * exporter guard (any cadence). Returns validated data for pages available
 * to all exporters.
 * @param {Request} request
 * @returns {Promise<{ registration: object, accreditation: object | undefined, reportDetail: object }>}
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

  if (!isExporterRegistration(registration)) {
    throw Boom.notFound()
  }

  const status = reportDetail.status?.currentStatus ?? reportDetail.status
  if (!reportDetail.id || status !== 'in_progress') {
    throw Boom.notFound()
  }

  return { registration, accreditation, reportDetail }
}

/**
 * Fetches registration/accreditation and report detail, then enforces the
 * accredited-exporter-monthly guard. Returns validated data for pages
 * available only to accredited exporters (prn-summary, free-perns).
 * @param {Request} request
 * @returns {Promise<{ registration: object, accreditation: object, reportDetail: object }>}
 */
export async function fetchGuardedAccreditedExporterData(request) {
  const { registration, accreditation, reportDetail } =
    await fetchGuardedExporterData(request)

  const { cadence } = request.params

  if (!accreditation || cadence !== CADENCE.MONTHLY) {
    throw Boom.notFound()
  }

  if (!reportDetail.prn) {
    throw Boom.badImplementation('PRN data missing for accredited report')
  }

  return { registration, accreditation, reportDetail }
}

/**
 * Fetches guarded exporter data and builds the common view data fields
 * shared by exporter pages. Page-specific fields are merged from the
 * callback return value.
 * @param {Request} request
 * @param {(ctx: { registration: object, accreditation: object | undefined, reportDetail: object, material: string, periodLabel: string, periodPath: string }) => object} buildPageFields
 * @param {object} [options]
 * @param {boolean} [options.accreditedOnly] - Use accredited guard (prn-summary, free-perns)
 * @param {boolean} [options.registeredOnly] - Restrict to registered-only exporters (tonnes-not-exported)
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

  const { registration, accreditation, reportDetail } = options.accreditedOnly
    ? await fetchGuardedAccreditedExporterData(request)
    : await fetchGuardedExporterData(request)

  if (options.registeredOnly && accreditation) {
    throw Boom.notFound()
  }

  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
  const periodShort = formatPeriodShort({ year, period }, cadence, localise)
  const periodPath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}`

  const pageFields = buildPageFields({
    registration,
    accreditation,
    reportDetail,
    material,
    periodLabel,
    periodShort,
    periodPath,
    period
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
