import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
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
import { dashTonnes } from './helpers/dash-formatters.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
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
  return localise('reports:supportingInformationNone')
}

/**
 * @param {Pick<Registration, 'wasteProcessingType'>} registration
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
 *   accreditation: Accreditation | undefined,
 *   basePath: string,
 *   cadenceLabel: string,
 *   localise: TFunction,
 *   localiseUrl: (path: string) => string,
 *   material: string,
 *   periodLabel: string,
 *   registration: Registration,
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
  reportDetail
}) {
  const { recyclingActivity, exportActivity, wasteSent } = reportDetail
  const isExporter = isExporterRegistration(registration)
  const isReprocessor = isReprocessorRegistration(registration)
  const isAccreditedExporter = isExporter && !!accreditation
  const isRegisteredOnlyExporter = isExporter && !accreditation

  return {
    accreditationNumber: accreditation?.accreditationNumber,
    backUrl: localiseUrl(`${basePath}/supporting-information`),
    cadenceLabel,
    caption: localise('reports:checkCaption'),
    changeText: localise('reports:supportingInformationChange'),
    changeUrl: localiseUrl(`${basePath}/supporting-information`),
    createButtonText: localise('reports:checkCreateReport'),
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
    prn: reportDetail.prn && buildPrnSummaryViewData(reportDetail.prn),
    prnRevenueChangeUrl: localiseUrl(`${basePath}/prn-summary`),
    recyclingActivity: {
      tonnageRecycled: dashTonnes(recyclingActivity.tonnageRecycled),
      tonnageNotRecycled: dashTonnes(recyclingActivity.tonnageNotRecycled)
    },
    registrationNumber: registration.registrationNumber,
    showApprovalColumn: isAccreditedExporter,
    site: registration.site,
    supportingInformation: getSupportingInformation(reportDetail, localise),
    supportingInformationLabel: localise('reports:supportingInformationLabel'),
    tonnageNotExportedChangeUrl: localiseUrl(`${basePath}/tonnes-not-exported`),
    tonnageNotRecycledChangeUrl: localiseUrl(`${basePath}/tonnes-not-recycled`),
    tonnageRecycledChangeUrl: localiseUrl(`${basePath}/tonnes-recycled`),
    version: reportDetail.version,
    wasteExported: isExporter
      ? buildWasteExportedViewData(exportActivity, {
          showApprovalColumn: isAccreditedExporter
        })
      : null,
    wasteReceived: buildWasteReceivedViewData(recyclingActivity),
    wasteSentOn: buildWasteSentOnViewData(wasteSent),
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

    const { registration, accreditation } =
      await fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      )

    const reportDetail = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber,
      session.idToken
    )

    if (reportDetail.status?.currentStatus !== SUBMISSION_STATUS.IN_PROGRESS) {
      return h.redirect(
        request.localiseUrl(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
      )
    }

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}`
    const material = getDisplayMaterial(registration)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
    const cadenceLabel = localise(`reports:${cadence}Heading`)

    const viewData = buildCheckViewData({
      registration,
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
    const {
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const { version } = request.payload
    const session = request.auth.credentials

    const transition = { status: SUBMISSION_STATUS.READY_TO_SUBMIT, version }

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
        `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}/created`
      )
    )
  }
}

/**
 * @import { TFunction } from 'i18next'
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 * @import { VersionedPayload } from './helpers/versioned-payload-schema.js'
 * @import { ReportDetailResponse } from './helpers/fetch-report-detail.js'
 */
