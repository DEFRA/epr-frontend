import Boom from '@hapi/boom'

import { fetchRegistrationAndAccreditationByNumber } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { badImplementation } from '#server/common/helpers/logging/cdp-boom.js'
import { getRegistrationMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { CADENCE, SUBMISSION_STATUS } from '../constants.js'
import { fetchReportDetail } from './fetch-report-detail.js'
import { formatPeriodLabel, formatPeriodShort } from './format-period-label.js'
import { reportPath, reportsListPath } from './report-paths.js'

/**
 * Fetches registration/accreditation and report detail, then enforces the
 * registration-type guard (any cadence). Returns validated data for pages
 * available to all matching registrations.
 * @param {(registration: Registration) => boolean} isMatchingRegistration
 * @param {HapiRequest & { params: PeriodParams }} request
 * @returns {Promise<{
 *   registration: Registration,
 *   accreditation: Accreditation | undefined,
 *   reportDetail: ReportDetailResponse
 * }>}
 */
async function fetchGuardedData(isMatchingRegistration, request) {
  const { organisationNumber, registrationNumber } = request.params
  const session = request.auth.credentials

  const [{ registration, accreditation }, reportDetail] = await Promise.all([
    fetchRegistrationAndAccreditationByNumber(
      organisationNumber,
      registrationNumber,
      session
    ),
    fetchReportDetail(request.params, session.backendToken)
  ])

  if (!isMatchingRegistration(registration)) {
    throw Boom.notFound()
  }

  if (reportDetail.status !== SUBMISSION_STATUS.IN_PROGRESS) {
    throw Boom.notFound()
  }

  return { registration, accreditation, reportDetail }
}

/**
 * Fetches registration/accreditation and report detail, then enforces the
 * accredited-monthly guard. Returns validated data for pages available
 * only to accredited operators (prn-summary, free-perns/free-prns).
 * @param {(registration: Registration) => boolean} isMatchingRegistration
 * @param {string} reportType
 * @param {HapiRequest & { params: PeriodParams }} request
 * @returns {Promise<{
 *   registration: Registration,
 *   accreditation: Accreditation,
 *   reportDetail: ReportDetailResponse
 * }>}
 */
async function fetchGuardedAccreditedData(
  isMatchingRegistration,
  reportType,
  request
) {
  const { registration, accreditation, reportDetail } = await fetchGuardedData(
    isMatchingRegistration,
    request
  )

  const { cadence } = request.params

  if (!accreditation || cadence !== CADENCE.MONTHLY) {
    throw Boom.notFound()
  }

  if (!reportDetail.prn) {
    throw badImplementation(
      'PRN data missing for accredited report',
      errorCodes.prnDataMissing,
      {
        event: {
          action: 'load_accredited_report',
          reason: `cadence=${cadence} reportType=${reportType}`
        }
      }
    )
  }

  return { registration, accreditation, reportDetail }
}

/**
 * @typedef {{
 *   registration: Registration,
 *   accreditation: Accreditation | undefined,
 *   reportDetail: ReportDetailResponse,
 *   material: string,
 *   periodLabel: string,
 *   periodShort: string,
 *   periodPath: string,
 *   reportsListPath: string,
 *   period: number
 * }} PageFieldsCtx
 */

/**
 * @typedef {{
 *   accreditedOnly?: boolean,
 *   registeredOnly?: boolean,
 *   value?: unknown
 * }} GuardOptions
 */

/**
 * `backUrl` is consumed by `buildViewData` (localised into the rendered URL);
 * other keys are forwarded to the template untouched.
 * @typedef {{
 *   backUrl: string,
 *   defaultValue?: unknown,
 *   [key: string]: unknown
 * }} PageFieldsResult
 */

/**
 * @typedef {(ctx: PageFieldsCtx) => (localise: TFunction) => PageFieldsResult} PageFieldsBuilder
 */

/**
 * @typedef {(ctx: PageFieldsCtx) => string} BackUrlBuilder
 */

/**
 * @typedef {(
 *   request: HapiRequest,
 *   buildPageFields: (ctx: PageFieldsCtx) => PageFieldsResult,
 *   options?: GuardOptions
 * ) => Promise<ViewData>} GuardFn
 */

/**
 * Rendered view data passed to the page's Nunjucks template.
 * @typedef {PageFieldsResult & {
 *   deleteUrl: string,
 *   value: unknown,
 *   errors: ValidationErrors | null,
 *   errorSummary: ErrorSummary | null
 * }} ViewData
 */

/**
 * Fetches guarded data and builds the common view data fields shared by
 * pages. Page-specific fields are merged from the callback return value.
 * @param {(registration: Registration) => boolean} isMatchingRegistration
 * @param {string} reportType
 * @param {HapiRequest & { params: PeriodParams }} request
 * @param {(ctx: PageFieldsCtx) => PageFieldsResult} buildPageFields
 * @param {GuardOptions} [options]
 * @returns {Promise<ViewData>}
 */
async function buildViewData(
  isMatchingRegistration,
  reportType,
  request,
  buildPageFields,
  options = {}
) {
  const { year, cadence, period } = request.params
  const { t: localise } = request

  const { registration, accreditation, reportDetail } = options.accreditedOnly
    ? await fetchGuardedAccreditedData(
        isMatchingRegistration,
        reportType,
        request
      )
    : await fetchGuardedData(isMatchingRegistration, request)

  if (options.registeredOnly && accreditation) {
    throw Boom.notFound()
  }

  const material = getRegistrationMaterialDisplayName(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
  const periodShort = formatPeriodShort({ year, period }, cadence, localise)
  const periodPath = reportPath(request.params)

  const pageFields = buildPageFields({
    registration,
    accreditation,
    reportDetail,
    material,
    periodLabel,
    periodShort,
    periodPath,
    reportsListPath: reportsListPath(request.params),
    period
  })

  return {
    ...pageFields,
    deleteUrl: request.localiseUrl(`${periodPath}/delete`),
    value: options.value ?? pageFields.defaultValue ?? '',
    errors: null,
    errorSummary: null
  }
}

/**
 * Binds a registration-type predicate to the page-guards trio. The exporter
 * and reprocessor subtrees both consume this factory; the only runtime
 * difference is which registration predicate is used.
 * @param {{
 *   isMatchingRegistration: (registration: Registration) => boolean,
 *   reportType: string
 * }} options
 */
export function createPageGuards({ isMatchingRegistration, reportType }) {
  return {
    fetchGuardedData: (request) =>
      fetchGuardedData(isMatchingRegistration, request),
    buildViewData: (request, buildPageFields, options) =>
      buildViewData(
        isMatchingRegistration,
        reportType,
        request,
        buildPageFields,
        options
      )
  }
}

/**
 * @import { TFunction } from 'i18next'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './period-params-schema.js'
 * @import { ReportDetailResponse } from './fetch-report-detail.js'
 * @import { ErrorSummary, ValidationErrors } from './validation.js'
 */
