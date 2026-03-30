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
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @returns {Promise<{ registration: object, reportDetail: object }>}
 */
export async function fetchGuardedExporterData(
  request,
  organisationId,
  registrationId,
  year,
  cadence,
  period
) {
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

  if (!reportDetail.id || reportDetail.status !== 'in_progress') {
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
 * @param {string} organisationId
 * @param {string} registrationId
 * @param {number} year
 * @param {string} cadence
 * @param {number} period
 * @param {(ctx: { registration: object, reportDetail: object, material: string, periodLabel: string, periodPath: string }) => object} buildPageFields
 * @param {object} [options]
 * @param {unknown} [options.value]
 * @param {object} [options.errors]
 * @param {object} [options.errorSummary]
 * @returns {Promise<object>}
 */
export async function buildExporterViewData(
  request,
  organisationId,
  registrationId,
  year,
  cadence,
  period,
  buildPageFields,
  options = {}
) {
  const { t: localise } = request

  const { registration, reportDetail } = await fetchGuardedExporterData(
    request,
    organisationId,
    registrationId,
    year,
    cadence,
    period
  )

  const material = getDisplayMaterial(registration)
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
 * Builds validation error objects from Joi error details, suitable for
 * govukErrorSummary and inline error display.
 * @param {Request} request
 * @param {import('joi').ValidationError} error
 * @returns {{ errors: Record<string, { text: string }>, errorSummary: { titleText: string, errorList: Array<{ text: string, href: string }> } }}
 */
export function buildValidationErrors(request, error) {
  const errors = {}
  const errorList = []

  for (const detail of error.details) {
    const field = detail.path[0]
    const message = request.t(detail.message)
    errors[field] = { text: message }
    errorList.push({ text: message, href: `#${field}` })
  }

  return {
    errors,
    errorSummary: {
      titleText: request.t('common:errorSummaryTitle'),
      errorList
    }
  }
}

/**
 * Returns the redirect URL for save (reports list) or continue (next page).
 * @param {Request} request
 * @param {{ organisationId: string, registrationId: string, year: number, cadence: string, period: number }} params
 * @param {string} action - 'continue' or 'save'
 * @param {string} nextPage - path segment for the continue destination (e.g. 'free-perns')
 * @returns {string}
 */
export function getRedirectUrl(request, params, action, nextPage) {
  const { organisationId, registrationId, year, cadence, period } = params
  const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports`

  if (action === 'continue') {
    return request.localiseUrl(
      `${basePath}/${year}/${cadence}/${period}/${nextPage}`
    )
  }

  return request.localiseUrl(basePath)
}

/**
 * @import { Request } from '@hapi/hapi'
 */
