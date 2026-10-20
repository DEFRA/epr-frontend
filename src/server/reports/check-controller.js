import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
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
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { reportAttempt } from './helpers/report-attempt.js'
import { reportPath, reportsListPath } from './helpers/report-paths.js'
import { JOURNEY } from '#server/common/helpers/metrics/constants.js'
import { metrics } from '#server/common/helpers/metrics/index.js'
import { updateReportStatus } from './helpers/update-report-status.js'
import { versionedPayloadSchema } from './helpers/versioned-payload-schema.js'

/**
 * @param {ReportDetailResponse} reportDetail
 * @param {TFunction} localise
 * @returns {string}
 */
function getSupportingInformation(reportDetail, localise) {
  if (reportDetail.supportingInformation) {
    return reportDetail.supportingInformation
  }
  return localise('reports:noneProvided')
}

/**
 * @param {Pick<RegistrationView, 'wasteProcessingType'>} registration
 * @param {TFunction} localise
 * @returns {{
 *   freeLabel: string,
 *   freeNote: string,
 *   noteTypeSectionHeading: string,
 *   revenueLabel: string,
 *   totalIssuedTonnageLabel: string,
 *   wasteReceivedHeading: string
 * }}
 */
function buildNoteTypeLabels(registration, localise) {
  const { noteTypePlural, wasteActionGerund } =
    getNoteTypeDisplayNames(registration)

  return {
    freeLabel: localise('reports:freeTonnageLabel', { noteTypePlural }),
    freeNote: localise('reports:freeTonnageNote'),
    noteTypeSectionHeading: localise('reports:noteTypeSectionHeading', {
      noteTypePlural
    }),
    revenueLabel: localise('reports:totalRevenueLabel', { noteTypePlural }),
    totalIssuedTonnageLabel: localise('reports:totalIssuedTonnage', {
      noteTypePlural
    }),
    wasteReceivedHeading: localise('reports:wasteReceivedHeading', {
      wasteActionGerund
    })
  }
}

/**
 * @param {{
 *   accreditation: AccreditationView | undefined,
 *   basePath: string,
 *   cadenceLabel: string,
 *   localise: TFunction,
 *   localiseUrl: (path: string) => string,
 *   material: string,
 *   periodLabel: string,
 *   registration: RegistrationView,
 *   registrationNumber: string,
 *   reportDetail: ReportDetailResponse
 * }} params
 * @returns {object}
 */
function buildCheckViewData({
  accreditation,
  basePath,
  cadenceLabel,
  localise,
  localiseUrl,
  material,
  periodLabel,
  registration,
  registrationNumber,
  reportDetail
}) {
  const { recyclingActivity, exportActivity, wasteSent } = reportDetail
  const isExporter = isExporterRegistration(registration)
  const isReprocessor = isReprocessorRegistration(registration)
  const isAccreditedExporter = isExporter && !!accreditation
  const isRegisteredOnlyExporter = isExporter && !accreditation
  const fallbackText = localise('reports:noneProvided')

  return {
    accreditationNumber: accreditation?.accreditationNumber,
    backUrl: localiseUrl(`${basePath}/supporting-information`),
    cadenceLabel,
    caption: localise('reports:createDraftReportCaption'),
    changeText: localise('reports:supportingInformationChange'),
    changeUrl: localiseUrl(`${basePath}/supporting-information`),
    createButtonText: localise('reports:createDraftReportCaption'),
    deleteUrl: localiseUrl(`${basePath}/delete`),
    freePernChangeUrl: localiseUrl(`${basePath}/free-perns`),
    freePrnsChangeUrl: localiseUrl(`${basePath}/free-prns`),
    heading: localise('reports:checkHeading'),
    isAccredited: !!accreditation,
    isExporter,
    isRegisteredOnlyExporter,
    isReprocessor,
    material,
    pageTitle: localise('reports:checkPageTitle', { material, periodLabel }),
    periodLabel,
    prn: buildPrnSummaryViewData(reportDetail.prn),
    prnRevenueChangeUrl: localiseUrl(`${basePath}/prn-summary`),
    recyclingActivity: {
      tonnageRecycled: formatTonnage(recyclingActivity.tonnageRecycled),
      tonnageNotRecycled: formatTonnage(recyclingActivity.tonnageNotRecycled)
    },
    registrationNumber,
    showApprovalColumn: isAccreditedExporter,
    site: siteNameOf(registration),
    supportingInformation: getSupportingInformation(reportDetail, localise),
    supportingInformationLabel: localise('reports:supportingInformationLabel'),
    tonnageNotExportedChangeUrl: localiseUrl(`${basePath}/tonnes-not-exported`),
    tonnageNotRecycledChangeUrl: localiseUrl(`${basePath}/tonnes-not-recycled`),
    tonnageRecycledChangeUrl: localiseUrl(`${basePath}/tonnes-recycled`),
    version: reportDetail.version,
    wasteExported: isExporter
      ? buildWasteExportedViewData(
          exportActivity,
          { showApprovalColumn: isAccreditedExporter },
          fallbackText
        )
      : null,
    wasteReceived: buildWasteReceivedViewData(recyclingActivity, fallbackText),
    wasteSentOn: buildWasteSentOnViewData(wasteSent, fallbackText),
    ...buildNoteTypeLabels(registration, localise)
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const checkGetController = {
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
    const { organisationNumber, registrationNumber, year, cadence, period } =
      request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const { registration, accreditation } =
      await fetchRegistrationWithAccreditation(
        { organisationNumber, registrationNumber },
        session.backendToken
      )

    const reportDetail = await fetchReportDetail(
      request.params,
      session.backendToken
    )

    if (reportDetail.status !== SUBMISSION_STATUS.IN_PROGRESS) {
      return h.redirect(request.localiseUrl(reportsListPath(request.params)))
    }

    const basePath = reportPath(request.params)
    const material = getMaterialDisplayName(registration.material)
    const periodLabel = formatPeriodLabelWithComma(
      { year, period },
      cadence,
      localise
    )
    const cadenceLabel = localise(`reports:${cadence}Heading`)

    const viewData = buildCheckViewData({
      registration,
      registrationNumber,
      accreditation,
      reportDetail,
      basePath,
      localise,
      localiseUrl: request.localiseUrl.bind(request),
      material,
      periodLabel,
      cadenceLabel
    })

    return h.view('reports/check-your-answers', viewData)
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const checkPostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: versionedPayloadSchema
    }
  },
  /**
   * @param {HapiRequest & {
   *   params: PeriodParams,
   *   payload: VersionedPayload
   * }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { version } = request.payload
    const session = request.auth.credentials

    const transition = { status: SUBMISSION_STATUS.READY_TO_SUBMIT, version }

    await updateReportStatus(request.params, transition, session.backendToken)

    await metrics.journey.end(
      request,
      JOURNEY.createReport,
      reportAttempt(request.params)
    )

    return h.redirect(
      request.localiseUrl(`${reportPath(request.params)}/created`)
    )
  }
}

/**
 * @import { TFunction } from 'i18next'
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { AccreditationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 * @import { VersionedPayload } from './helpers/versioned-payload-schema.js'
 * @import { ReportDetailResponse } from './helpers/fetch-report-detail.js'
 */
