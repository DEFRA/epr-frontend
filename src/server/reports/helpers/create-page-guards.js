import Boom from '@hapi/boom'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { CADENCE } from '../constants.js'
import { fetchReportDetail } from './fetch-report-detail.js'
import { formatPeriodLabel, formatPeriodShort } from './format-period-label.js'

/**
 * Fetches registration/accreditation and report detail, then enforces the
 * registration-type guard (any cadence). Returns validated data for pages
 * available to all matching registrations.
 * @param {(registration: object) => boolean} isMatchingRegistration
 * @param {HapiRequest & { params: PeriodParams }} request
 * @returns {Promise<{ registration: object, accreditation: object | undefined, reportDetail: ReportDetailResponse }>}
 */
async function fetchGuardedData(isMatchingRegistration, request) {
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

  if (!isMatchingRegistration(registration)) {
    throw Boom.notFound()
  }

  if (
    !reportDetail.id ||
    reportDetail.status?.currentStatus !== 'in_progress'
  ) {
    throw Boom.notFound()
  }

  return { registration, accreditation, reportDetail }
}

/**
 * Fetches registration/accreditation and report detail, then enforces the
 * accredited-monthly guard. Returns validated data for pages available
 * only to accredited operators (prn-summary, free-perns/free-prns).
 * @param {(registration: object) => boolean} isMatchingRegistration
 * @param {HapiRequest & { params: PeriodParams }} request
 * @returns {Promise<{ registration: object, accreditation: object, reportDetail: ReportDetailResponse }>}
 */
async function fetchGuardedAccreditedData(isMatchingRegistration, request) {
  const { registration, accreditation, reportDetail } = await fetchGuardedData(
    isMatchingRegistration,
    request
  )

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
 * Fetches guarded data and builds the common view data fields shared by
 * pages. Page-specific fields are merged from the callback return value.
 * @param {(registration: object) => boolean} isMatchingRegistration
 * @param {HapiRequest & { params: PeriodParams }} request
 * @param {(ctx: {
 *   registration: object,
 *   accreditation: object | undefined,
 *   reportDetail: ReportDetailResponse,
 *   material: string,
 *   periodLabel: string,
 *   periodShort: string,
 *   periodPath: string,
 *   reportsListPath: string,
 *   period: number
 * }) => { backUrl?: string, defaultValue?: unknown, [key: string]: unknown }} buildPageFields
 * @param {object} [options]
 * @param {boolean} [options.accreditedOnly] - Use accredited guard (prn-summary, free-perns/free-prns)
 * @param {boolean} [options.registeredOnly] - Restrict to registered-only operators (tonnes-not-exported)
 * @param {unknown} [options.value]
 * @param {object} [options.errors]
 * @param {object} [options.errorSummary]
 * @returns {Promise<object>}
 */
async function buildViewData(
  isMatchingRegistration,
  request,
  buildPageFields,
  options = {}
) {
  const { organisationId, registrationId, year, cadence, period } =
    request.params
  const { t: localise } = request

  const { registration, accreditation, reportDetail } = options.accreditedOnly
    ? await fetchGuardedAccreditedData(isMatchingRegistration, request)
    : await fetchGuardedData(isMatchingRegistration, request)

  if (options.registeredOnly && accreditation) {
    throw Boom.notFound()
  }

  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
  const periodShort = formatPeriodShort({ year, period }, cadence, localise)
  const reportsListPath = `/organisations/${organisationId}/registrations/${registrationId}/reports`
  const periodPath = `${reportsListPath}/${year}/${cadence}/${period}`

  const pageFields = buildPageFields({
    registration,
    accreditation,
    reportDetail,
    material,
    periodLabel,
    periodShort,
    periodPath,
    reportsListPath,
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
 * Binds a registration-type predicate to the page-guards trio. The exporter
 * and reprocessor subtrees both consume this factory; the only runtime
 * difference is which registration predicate is used.
 * @param {{ isMatchingRegistration: (registration: object) => boolean }} options
 */
export function createPageGuards({ isMatchingRegistration }) {
  return {
    fetchGuardedData: (request) =>
      fetchGuardedData(isMatchingRegistration, request),
    buildViewData: (request, buildPageFields, options) =>
      buildViewData(isMatchingRegistration, request, buildPageFields, options)
  }
}

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './period-params-schema.js'
 * @import { ReportDetailResponse } from './fetch-report-detail.js'
 */
