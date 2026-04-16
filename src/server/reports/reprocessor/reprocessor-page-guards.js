import Boom from '@hapi/boom'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { isReprocessorRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { CADENCE } from '../constants.js'
import { fetchReportDetail } from '../helpers/fetch-report-detail.js'
import {
  formatPeriodLabel,
  formatPeriodShort
} from '../helpers/format-period-label.js'

/**
 * Fetches registration/accreditation and report detail, then enforces the
 * reprocessor guard (any cadence). Returns validated data for pages available
 * to all reprocessors (tonnes-recycled, tonnes-not-recycled).
 * @param {HapiRequest & { params: PeriodParams }} request
 * @returns {Promise<{ registration: object, accreditation: object | undefined, reportDetail: ReportDetailResponse }>}
 */
export async function fetchGuardedReprocessorData(request) {
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

  if (!isReprocessorRegistration(registration)) {
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
 * accredited-reprocessor-monthly guard. Returns validated data for pages
 * available only to accredited reprocessors (prn-summary, free-prns).
 * @param {HapiRequest & { params: PeriodParams }} request
 * @returns {Promise<{ registration: object, accreditation: object, reportDetail: ReportDetailResponse }>}
 */
export async function fetchGuardedAccreditedReprocessorData(request) {
  const { registration, accreditation, reportDetail } =
    await fetchGuardedReprocessorData(request)

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
 * Fetches guarded reprocessor data and builds the common view data fields
 * shared by reprocessor pages. Page-specific fields are merged from the
 * callback return value.
 * @param {HapiRequest & { params: PeriodParams }} request
 * @param {(ctx: {
 *   registration: object,
 *   accreditation: object | undefined,
 *   reportDetail: ReportDetailResponse,
 *   material: string,
 *   periodLabel: string,
 *   periodShort: string,
 *   periodPath: string,
 *   reportsListPath: string
 * }) => { backUrl?: string, defaultValue?: unknown, [key: string]: unknown }} buildPageFields
 * @param {object} [options]
 * @param {unknown} [options.value]
 * @param {object} [options.errors]
 * @param {object} [options.errorSummary]
 * @param {boolean} [options.accreditedOnly]
 * @returns {Promise<object>}
 */
export async function buildReprocessorViewData(
  request,
  buildPageFields,
  options = {}
) {
  const { organisationId, registrationId, year, cadence, period } =
    request.params
  const { t: localise } = request

  const { registration, accreditation, reportDetail } = options.accreditedOnly
    ? await fetchGuardedAccreditedReprocessorData(request)
    : await fetchGuardedReprocessorData(request)

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
    reportsListPath
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
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from '../helpers/period-params-schema.js'
 * @import { ReportDetailResponse } from '../helpers/fetch-report-detail.js'
 */
