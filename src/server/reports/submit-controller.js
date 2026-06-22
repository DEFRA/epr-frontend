import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import {
  getNoteTypeDisplayNames,
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
import { SUBMISSION_STATUS } from './constants.js'
import {
  buildDestinationDetailRows,
  buildOverseasSiteRows,
  buildSupplierDetailRows,
  buildUnapprovedOverseasSiteRows,
  getTotalTonnageSentOn
} from './helpers/build-table-rows.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatExportTonnages } from './helpers/format-export-tonnages.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { updateReportStatus } from './helpers/update-report-status.js'
import { buildValidationErrors } from './helpers/validation.js'
import { submitPayloadSchema } from './helpers/versioned-payload-schema.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { CadenceValue } from './constants.js'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 * @import { ReportDetailResponse } from './helpers/fetch-report-detail.js'
 * @import { SubmitPayload } from './helpers/versioned-payload-schema.js'
 */

/**
 * @param {{ at: string, by: { name: string } }} statusCreated
 * @param {import('./helpers/format-period-label.js').Localise} localise
 * @returns {{ createdBy: string, createdOn: string }}
 */
function getCreationDetails(statusCreated, localise) {
  const { by, at } = statusCreated

  return {
    createdBy: by.name,
    createdOn: localise('reports:submitCreatedOnValue', {
      date: formatDate(at),
      time: formatTime(at)
    })
  }
}

const defaultExportActivity = {
  totalTonnageExported: 0,
  overseasSites: [],
  tonnageReceivedNotExported: null,
  tonnageRefusedAtDestination: null,
  tonnageStoppedDuringExport: null,
  totalTonnageRefusedOrStopped: null,
  tonnageRepatriated: null
}

/**
 * @param {object|null|undefined} exportActivity
 * @param {boolean} isExporter
 * @param {boolean} isAccreditedExporter
 * @returns {object|null}
 */
function buildWasteExported(exportActivity, isExporter, isAccreditedExporter) {
  if (!isExporter) {
    return null
  }

  const activity = exportActivity ?? defaultExportActivity
  return {
    totalTonnage: formatTonnage(activity.totalTonnageExported),
    overseasSiteRows: buildOverseasSiteRows(activity.overseasSites, {
      showApprovalColumn: isAccreditedExporter
    }),
    unapprovedOverseasSiteRows: buildUnapprovedOverseasSiteRows(
      activity.unapprovedOverseasSites ?? []
    ),
    ...formatExportTonnages(activity)
  }
}

/**
 * @typedef {{
 *   destinationDetailRows: Array<Array<{text: string | null}>>,
 *   toExporters: string,
 *   toOtherSites: string,
 *   toReprocessors: string,
 *   totalTonnage: string
 * }} WasteSentOnViewData
 */

/**
 * @param {ReportDetailResponse['wasteSent']} wasteSent
 * @returns {WasteSentOnViewData}
 */
const buildWasteSentOnViewData = (wasteSent) => ({
  destinationDetailRows: buildDestinationDetailRows(
    wasteSent.finalDestinations
  ),
  toExporters: formatTonnage(wasteSent.tonnageSentToExporter),
  toOtherSites: formatTonnage(wasteSent.tonnageSentToAnotherSite),
  toReprocessors: formatTonnage(wasteSent.tonnageSentToReprocessor),
  totalTonnage: formatTonnage(getTotalTonnageSentOn(wasteSent))
})

/**
 * @param {{ localise: import('./helpers/format-period-label.js').Localise, material: string, periodLabel: string, noteTypePlural: string, wasteActionGerund: string }} params
 * @returns {object}
 */
function buildPageLabels({
  localise,
  material,
  periodLabel,
  noteTypePlural,
  wasteActionGerund
}) {
  return {
    pageTitle: localise('reports:submitPageTitle', { material, periodLabel }),
    heading: localise('reports:submitHeading', { periodLabel }),
    wasteReceivedHeading: localise('reports:wasteReceivedHeading', {
      wasteActionGerund
    }),
    noteTypeSectionHeading: localise('reports:noteTypeSectionHeading', {
      noteTypePlural
    }),
    totalIssuedTonnageLabel: localise('reports:totalIssuedTonnage', {
      noteTypePlural
    }),
    freeLabel: localise('reports:submitFreeLabel', { noteTypePlural }),
    revenueLabel: localise('reports:submitTotalRevenue', { noteTypePlural }),
    avgPriceLabel: localise('reports:submitAvgPrice', { noteTypePlural })
  }
}

/**
 * @param {ReportDetailResponse['recyclingActivity']} recyclingActivity
 * @returns {{ totalTonnage: string, supplierDetailRows: Array<Array<{text: string | null}>> }}
 */
const buildWasteReceivedViewData = (recyclingActivity) => ({
  totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived),
  supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers)
})

/**
 * @param {ReportDetailResponse['recyclingActivity']} recyclingActivity
 * @returns {{ tonnageRecycled: string, tonnageNotRecycled: string }}
 */
const buildRecyclingActivityViewData = (recyclingActivity) => ({
  tonnageRecycled: formatTonnage(recyclingActivity.tonnageRecycled),
  tonnageNotRecycled: formatTonnage(recyclingActivity.tonnageNotRecycled)
})

/**
 * @typedef {{
 *   registration: import('#domain/organisations/registration.js').Registration,
 *   accreditation: object | null,
 *   reportDetail: ReportDetailResponse,
 *   reportsUrl: string,
 *   localise: import('./helpers/format-period-label.js').Localise,
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
 * @param {ReportDetailResponse['prn']} prn
 * @returns {object}
 */
const buildPrnViewData = (prn) => ({
  averagePricePerTonne: prn?.averagePricePerTonne,
  freeTonnage: prn?.freeTonnage,
  issuedTonnage: prn?.issuedTonnage,
  totalRevenue: prn?.totalRevenue
})

/**
 * @param {import('./helpers/format-period-label.js').Localise} localise
 * @param {string} organisationName
 * @returns {string[]}
 */
const buildDeclarationItems = (localise, organisationName) => [
  localise('reports:submitDeclarationItem1', { organisationName }),
  localise('reports:submitDeclarationItem2'),
  localise('reports:submitDeclarationItem3')
]

/**
 * @param {BuildViewModelParams} params
 * @returns {object}
 */
function buildViewModel({
  registration,
  accreditation,
  reportDetail,
  reportsUrl,
  localise,
  year,
  cadence,
  period,
  submissionNumber,
  submissionDeclaredBy,
  errors,
  errorSummary
}) {
  const status = /** @type {NonNullable<ReportDetailResponse['status']>} */ (
    reportDetail.status
  )
  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
  const { recyclingActivity, exportActivity, wasteSent } = reportDetail
  const isExporter = isExporterRegistration(registration)
  const isAccreditedExporter = isExporter && !!accreditation
  const isRegisteredOnlyExporter = isExporter && !accreditation
  const { noteTypePlural, wasteActionGerund } =
    getNoteTypeDisplayNames(registration)
  const { createdBy, createdOn } = getCreationDetails(status.created, localise)

  return {
    ...buildPageLabels({
      localise,
      material,
      periodLabel,
      noteTypePlural,
      wasteActionGerund
    }),
    isAccredited: !!accreditation,
    isReprocessor: isReprocessorRegistration(registration),
    isExporter,
    isRegisteredOnlyExporter,
    showApprovalColumn: isAccreditedExporter,
    backUrl: reportsUrl,
    insetText: localise('reports:submitInsetText'),
    statusTag: localise('reports:statusReadyToSubmit'),
    createdByLabel: localise('reports:submitCreatedByLabel'),
    createdBy,
    createdOnLabel: localise('reports:submitCreatedOnLabel'),
    createdOn,
    periodLabel,
    material,
    site: reportDetail.details.site,
    wasteReceived: buildWasteReceivedViewData(recyclingActivity),
    wasteExported: buildWasteExported(
      exportActivity,
      isExporter,
      isAccreditedExporter
    ),
    wasteSentOn: buildWasteSentOnViewData(wasteSent),
    prn: buildPrnViewData(reportDetail.prn),
    recyclingActivity: buildRecyclingActivityViewData(recyclingActivity),
    supportingInformation:
      reportDetail.supportingInformation ||
      localise('reports:supportingInformationNone'),
    declarationItems: buildDeclarationItems(localise, registration.orgName),
    version: reportDetail.version,
    submissionDeclaredBy: submissionDeclaredBy ?? null,
    errors: errors ?? null,
    errorSummary: errorSummary ?? null,
    deleteUrl: `${reportsUrl}/${year}/${cadence}/${period}/submissions/${submissionNumber}/delete`
  }
}

/**
 * @param {HapiRequest & { params: PeriodParams }} request
 * @param {{ submissionDeclaredBy?: string | null, errors?: object | null, errorSummary?: object | null }} [options]
 * @returns {Promise<object>}
 */
async function buildViewData(request, options = {}) {
  const {
    organisationId,
    registrationId,
    year,
    cadence,
    period,
    submissionNumber
  } = request.params
  const session = request.auth.credentials
  const { t: localise } = request

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
      submissionNumber,
      session.idToken
    )
  ])

  const reportsUrl = request.localiseUrl(
    `/organisations/${organisationId}/registrations/${registrationId}/reports`
  )

  return buildViewModel({
    registration,
    accreditation,
    reportDetail,
    reportsUrl,
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
    const {
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const session = request.auth.credentials

    const reportDetail = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber,
      session.idToken
    )

    const status = /** @type {NonNullable<ReportDetailResponse['status']>} */ (
      reportDetail.status
    )

    if (status.currentStatus === SUBMISSION_STATUS.SUBMITTED) {
      return h.redirect(
        request.localiseUrl(
          `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}/submitted`
        )
      )
    }

    const viewData = await buildViewData(request)

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
          /** @type {import('joi').ValidationError} */ (error)
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
    const {
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const { version, submissionDeclaredBy } = request.payload
    const session = request.auth.credentials

    const transition = {
      status: SUBMISSION_STATUS.SUBMITTED,
      version,
      submissionDeclaredBy
    }

    await updateReportStatus(
      {
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        submissionNumber
      },
      transition,
      session.idToken
    )

    return h.redirect(
      request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}/submitted`
      )
    )
  }
}
