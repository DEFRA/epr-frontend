import Boom from '@hapi/boom'

import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { siteNameOf } from '#server/common/helpers/organisations/site-name.js'
import {
  getNoteTypeDisplayNames,
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
import { SUBMISSION_STATUS } from './constants.js'
import {
  buildPrnSummaryViewData,
  buildWasteExportedViewData,
  buildWasteReceivedViewData,
  buildWasteSentOnViewData
} from './helpers/build-report-view-data.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabelWithComma } from './helpers/format-period-label.js'
import {
  getStatusLabel,
  getStatusTagClass
} from './helpers/format-submission-status.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { reportAttempt } from './helpers/report-attempt.js'
import { reportPath, reportsListPath } from './helpers/report-paths.js'
import { organisationViewName } from '#server/registrations/details/helpers/caption.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { isResubmission } from './helpers/resubmission.js'
import { updateReportStatus } from './helpers/update-report-status.js'
import { buildValidationErrors } from './helpers/validation.js'
import { submitPayloadSchema } from './helpers/versioned-payload-schema.js'

/** @import { Localise } from './helpers/format-period-label.js' */
/** @import { AccreditationView, OrganisationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js' */
/** @import { ValidationError } from 'joi' */

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { CadenceValue } from './constants.js'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 * @import { ReportDetailResponse } from './helpers/fetch-report-detail.js'
 * @import { SubmitPayload } from './helpers/versioned-payload-schema.js'
 */

/**
 * @param {Pick<ReportDetailResponse, 'createdAt' | 'createdBy'>} reportDetail
 * @param {Localise} localise
 * @returns {{ createdBy: string | undefined, createdOn: string }}
 */
function getCreationDetails(reportDetail, localise) {
  const { createdAt, createdBy } =
    /** @type {Required<Pick<ReportDetailResponse, 'createdAt' | 'createdBy'>>} */ (
      reportDetail
    )

  return {
    createdBy: createdBy.name,
    createdOn: localise('reports:submitCreatedOnValue', {
      date: formatDate(createdAt),
      time: formatTime(createdAt)
    })
  }
}

/**
 * @param {{ localise: Localise, material: string, periodLabel: string, noteTypePlural: string, wasteActionGerund: string, resubmission: boolean }} params
 * @returns {object}
 */
function buildPageLabels({
  localise,
  material,
  periodLabel,
  noteTypePlural,
  wasteActionGerund,
  resubmission
}) {
  return {
    pageTitle: localise(
      resubmission ? 'reports:resubmitPageTitle' : 'reports:submitPageTitle',
      { material, periodLabel }
    ),
    heading: localise(
      resubmission ? 'reports:resubmitHeading' : 'reports:submitHeading',
      { periodLabel }
    ),
    wasteReceivedHeading: localise('reports:wasteReceivedHeading', {
      wasteActionGerund
    }),
    noteTypeSectionHeading: localise('reports:noteTypeSectionHeading', {
      noteTypePlural
    }),
    totalIssuedTonnageLabel: localise('reports:totalIssuedTonnage', {
      noteTypePlural
    }),
    freeLabel: localise('reports:freeTonnageLabel', { noteTypePlural }),
    revenueLabel: localise('reports:totalRevenueLabel', { noteTypePlural }),
    avgPriceLabel: localise('reports:avgPriceLabel')
  }
}

/**
 * @param {ReportDetailResponse['recyclingActivity']} recyclingActivity
 * @returns {{ tonnageRecycled: string, tonnageNotRecycled: string }}
 */
const buildRecyclingActivityViewData = (recyclingActivity) => ({
  tonnageRecycled: formatTonnage(recyclingActivity.tonnageRecycled),
  tonnageNotRecycled: formatTonnage(recyclingActivity.tonnageNotRecycled)
})

/**
 * @param {{ recyclingActivity: object, exportActivity: object | undefined, wasteSent: object }} activity
 * @param {{ isExporter: boolean, isAccreditedExporter: boolean }} flags
 * @param {string} fallbackText
 * @returns {{ wasteReceived: object, wasteExported: object | null, wasteSentOn: object, recyclingActivity: { tonnageRecycled: string, tonnageNotRecycled: string } }}
 */
function buildActivityViewData(
  { recyclingActivity, exportActivity, wasteSent },
  { isExporter, isAccreditedExporter },
  fallbackText
) {
  return {
    wasteReceived: buildWasteReceivedViewData(recyclingActivity, fallbackText),
    wasteExported: isExporter
      ? buildWasteExportedViewData(
          exportActivity,
          { showApprovalColumn: isAccreditedExporter },
          fallbackText
        )
      : null,
    wasteSentOn: buildWasteSentOnViewData(wasteSent, fallbackText),
    recyclingActivity: buildRecyclingActivityViewData(recyclingActivity)
  }
}

/**
 * @typedef {{
 *   organisation: OrganisationView,
 *   registration: RegistrationView,
 *   accreditation: AccreditationView | undefined,
 *   reportDetail: ReportDetailResponse,
 *   reportsUrl: string,
 *   deleteUrl: string,
 *   localise: Localise,
 *   year: number,
 *   cadence: CadenceValue,
 *   period: number,
 *   submissionNumber: number,
 *   submissionDeclaredBy?: string | null,
 *   errors?: object | null,
 *   errorSummary?: object | null
 * }} BuildViewModelParams
 */

/**
 * @param {Localise} localise
 * @param {string} organisationName
 * @returns {string[]}
 */
const buildDeclarationItems = (localise, organisationName) => [
  localise('reports:submitDeclarationItem1', { organisationName }),
  localise('reports:submitDeclarationItem2'),
  localise('reports:submitDeclarationItem3')
]

/**
 * The Details-block status for the review page. A resubmission draft keeps its
 * period's Requires resubmission status (purple) in place of the standard Ready
 * to submit tag, and drives the "Resubmit report for …" heading. isResubmission
 * bundles the flag, so the page renders as the standard submit flow until
 * closed-period adjustments ship.
 * @param {number} submissionNumber
 * @param {Localise} localise
 * @returns {{ resubmission: boolean, statusTag: string, statusTagClass: string }}
 */
function buildSubmitStatus(submissionNumber, localise) {
  const resubmission = isResubmission(submissionNumber)
  const status = resubmission
    ? SUBMISSION_STATUS.REQUIRES_RESUBMISSION
    : SUBMISSION_STATUS.READY_TO_SUBMIT

  return {
    resubmission,
    statusTag: getStatusLabel(status, localise),
    statusTagClass: getStatusTagClass(status)
  }
}

/**
 * @param {Pick<BuildViewModelParams, 'registration' | 'year' | 'cadence' | 'period' | 'localise'>} params
 * @returns {{ material: string, periodLabel: string }}
 */
function getReportSummaryFields({
  registration,
  year,
  cadence,
  period,
  localise
}) {
  const material = getMaterialDisplayName(registration.material)
  const periodLabel = formatPeriodLabelWithComma(
    { year, period },
    cadence,
    localise
  )

  return { material, periodLabel }
}

/**
 * @param {BuildViewModelParams} params
 * @returns {object}
 */
function buildViewModel({
  organisation,
  registration,
  accreditation,
  reportDetail,
  reportsUrl,
  deleteUrl,
  localise,
  year,
  cadence,
  period,
  submissionNumber,
  submissionDeclaredBy,
  errors,
  errorSummary
}) {
  const { material, periodLabel } = getReportSummaryFields({
    registration,
    year,
    cadence,
    period,
    localise
  })
  const { recyclingActivity, exportActivity, wasteSent } = reportDetail
  const isExporter = isExporterRegistration(registration)
  const isAccreditedExporter = isExporter && !!accreditation
  const isRegisteredOnlyExporter = isExporter && !accreditation
  const { noteTypePlural, wasteActionGerund } =
    getNoteTypeDisplayNames(registration)
  const { createdBy, createdOn } = getCreationDetails(reportDetail, localise)
  const submitStatus = buildSubmitStatus(submissionNumber, localise)
  const fallbackText = localise('reports:noneProvided')
  const activityViewData = buildActivityViewData(
    { recyclingActivity, exportActivity, wasteSent },
    { isExporter, isAccreditedExporter },
    fallbackText
  )

  return {
    ...buildPageLabels({
      localise,
      material,
      periodLabel,
      noteTypePlural,
      wasteActionGerund,
      resubmission: submitStatus.resubmission
    }),
    isAccredited: !!accreditation,
    isReprocessor: isReprocessorRegistration(registration),
    isExporter,
    isRegisteredOnlyExporter,
    showApprovalColumn: isAccreditedExporter,
    backUrl: reportsUrl,
    insetText: localise('reports:submitInsetText'),
    statusTag: submitStatus.statusTag,
    statusTagClass: submitStatus.statusTagClass,
    createdByLabel: localise('reports:submitCreatedByLabel'),
    createdBy,
    createdOnLabel: localise('reports:submitCreatedOnLabel'),
    createdOn,
    periodLabel,
    material,
    site: siteNameOf(registration),
    ...activityViewData,
    prn: buildPrnSummaryViewData(reportDetail.prn),
    supportingInformation: reportDetail.supportingInformation || fallbackText,
    declarationItems: buildDeclarationItems(
      localise,
      organisationViewName(organisation)
    ),
    version: reportDetail.version,
    submissionDeclaredBy: submissionDeclaredBy ?? null,
    errors: errors ?? null,
    errorSummary: errorSummary ?? null,
    deleteUrl
  }
}

/**
 * @param {HapiRequest & { params: PeriodParams }} request
 * @param {{ submissionDeclaredBy?: string | null, errors?: object | null, errorSummary?: object | null }} [options]
 * @returns {Promise<object>}
 */
async function buildViewData(request, options = {}) {
  const {
    organisationNumber,
    registrationNumber,
    year,
    cadence,
    period,
    submissionNumber
  } = request.params
  const session = request.auth.credentials
  const { t: localise } = request

  const { organisation, registration, accreditation } =
    await fetchRegistrationWithAccreditation(
      { organisationNumber, registrationNumber },
      session.backendToken
    )
  const reportDetail = await fetchReportDetail(
    request.params,
    session.backendToken
  )

  return buildViewModel({
    organisation,
    registration,
    accreditation,
    reportDetail,
    reportsUrl: request.localiseUrl(reportsListPath(request.params)),
    deleteUrl: request.localiseUrl(`${reportPath(request.params)}/delete`),
    localise,
    year,
    cadence,
    period,
    submissionNumber,
    ...options
  })
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: PeriodParams }>>} */
export const submitGetController = {
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
    const session = request.auth.credentials

    const { status } = await fetchReportDetail(
      request.params,
      session.backendToken
    )

    if (status === SUBMISSION_STATUS.SUBMITTED) {
      return h.redirect(
        request.localiseUrl(`${reportPath(request.params)}/submitted`)
      )
    }

    // The review page can only submit a ready-to-submit draft. Any other state
    // (for example an in-progress draft reached by a hand-edited URL) is illegal
    // here, so refuse it rather than render a submittable page for it. This also
    // upholds the resubmission variant's precondition: a report reaching the
    // render below is ready to submit, so a submissionNumber above the first is
    // genuinely a resubmission awaiting submission.
    if (status !== SUBMISSION_STATUS.READY_TO_SUBMIT) {
      throw Boom.notFound()
    }

    const viewData = await buildViewData(request)

    await metrics.journey.start(
      request,
      JOURNEY.submitReport,
      reportAttempt(request.params)
    )

    return h.view('reports/submit', viewData)
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: PeriodParams, payload: SubmitPayload }>>} */
export const submitPostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: submitPayloadSchema,
      /**
       * @param {HapiRequest & { params: PeriodParams, payload: SubmitPayload }} request
       * @param {ResponseToolkit} h
       * @param {Error | undefined} error
       */
      async failAction(request, h, error) {
        const { errors, errorSummary } = buildValidationErrors(
          request,
          /** @type {ValidationError} */ (error)
        )

        const viewData = await buildViewData(request, {
          submissionDeclaredBy: request.payload?.submissionDeclaredBy,
          errors,
          errorSummary
        })

        return h.view('reports/submit', viewData).takeover()
      }
    }
  },
  /**
   * @param {HapiRequest & {
   *   params: PeriodParams,
   *   payload: SubmitPayload
   * }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { version, submissionDeclaredBy } = request.payload
    const session = request.auth.credentials

    const transition = {
      status: SUBMISSION_STATUS.SUBMITTED,
      version,
      submissionDeclaredBy
    }

    await updateReportStatus(request.params, transition, session.backendToken)

    await metrics.journey.end(
      request,
      JOURNEY.submitReport,
      reportAttempt(request.params)
    )

    return h.redirect(
      request.localiseUrl(`${reportPath(request.params)}/submitted`)
    )
  }
}
