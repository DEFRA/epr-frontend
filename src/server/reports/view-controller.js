import Boom from '@hapi/boom'
import { isOperatorInitiatedResubmissionEnabled } from '#config/config.js'
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import {
  buildPrnSummaryViewData,
  buildWasteExportedViewData,
  buildWasteReceivedViewData,
  buildWasteSentOnViewData
} from './helpers/build-report-view-data.js'
import { formatPeriodLabelWithComma } from './helpers/format-period-label.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import {
  getNoteTypeDisplayNames,
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { SUBMISSION_STATUS } from './constants.js'

/** @import { SubmissionStatusValue } from './constants.js' */

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */

/**
 * @param {{ localise: (key: string, params?: Record<string, string>) => string, periodLabel: string, noteTypePlural: string, wasteActionGerund: string, status: SubmissionStatusValue }} params
 * @returns {object}
 */
function buildPageLabels({
  localise,
  periodLabel,
  noteTypePlural,
  wasteActionGerund,
  status
}) {
  const isDraft = status === SUBMISSION_STATUS.READY_TO_SUBMIT
  const headingKey = isDraft
    ? 'reports:view:draftHeading'
    : 'reports:view:heading'
  const pageTitleKey = isDraft
    ? 'reports:view:draftPageTitle'
    : 'reports:view:pageTitle'

  return {
    pageTitle: localise(pageTitleKey),
    heading: localise(headingKey, { periodLabel }),
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
 * @param {object} reportDetail
 * @param {SubmissionStatusValue} status
 * @param {(key: string, params?: Record<string, string>) => string} localise
 * @returns {{ statusTag: string, statusTagClass: string, authorLabel: string, authorValue: string, dateLabel: string, dateValue: string }}
 */
function buildStatusDetails(reportDetail, status, localise) {
  const isDraft = status === SUBMISSION_STATUS.READY_TO_SUBMIT
  const statusEntry = isDraft
    ? reportDetail.status.created
    : reportDetail.status.submitted
  const labelPrefix = isDraft ? 'created' : 'submitted'

  return {
    statusTag: localise(
      isDraft ? 'reports:statusReadyToSubmit' : 'reports:statusSubmitted'
    ),
    statusTagClass: isDraft ? 'govuk-tag--blue' : 'govuk-tag--green',
    authorLabel: localise(`reports:view:${labelPrefix}ByLabel`),
    authorValue: statusEntry.by.name,
    dateLabel: localise(`reports:view:${labelPrefix}OnLabel`),
    dateValue: localise(`reports:view:${labelPrefix}OnValue`, {
      date: formatDate(statusEntry.at),
      time: formatTime(statusEntry.at)
    })
  }
}

/**
 * @param {object} registration
 * @param {object} accreditation
 * @returns {{ isAccredited: boolean, isExporter: boolean, isReprocessor: boolean, isRegisteredOnlyExporter: boolean }}
 */
function buildRegistrationFlags(registration, accreditation) {
  const isAccredited = !!accreditation
  const isExporter = isExporterRegistration(registration)
  const isReprocessor = isReprocessorRegistration(registration)
  const isRegisteredOnlyExporter = isExporter && !isAccredited

  return { isAccredited, isExporter, isReprocessor, isRegisteredOnlyExporter }
}

/**
 * @param {object} params
 * @param {object} params.reportDetail
 * @param {boolean} params.isExporter
 * @param {boolean} params.isAccredited
 * @param {string} params.fallbackText
 * @returns {object}
 */
function buildActivityViewData({
  reportDetail,
  isExporter,
  isAccredited,
  fallbackText
}) {
  const { recyclingActivity, exportActivity, wasteSent } = reportDetail

  return {
    wasteReceived: buildWasteReceivedViewData(recyclingActivity, fallbackText),

    packagingWasteRecycling: {
      tonnageRecycled: formatTonnage(recyclingActivity.tonnageRecycled),
      tonnageNotRecycled: formatTonnage(recyclingActivity.tonnageNotRecycled)
    },

    wasteExported: isExporter
      ? buildWasteExportedViewData(
          exportActivity,
          { showApprovalColumn: isAccredited },
          fallbackText
        )
      : null,

    prn: buildPrnSummaryViewData(reportDetail.prn),

    wasteSentOn: buildWasteSentOnViewData(wasteSent, fallbackText),

    supportingInformation: reportDetail.supportingInformation || fallbackText
  }
}

/**
 * @param {object} params
 * @param {object} params.viewData
 * @param {boolean} params.isDraft
 * @param {object} params.reportDetail
 * @param {string} params.reportsUrl
 * @param {string} params.makeChangesUrl
 * @param {(key: string, params?: Record<string, string>) => string} params.localise
 */
function applyDraftAndResubmissionExtras({
  viewData,
  isDraft,
  reportDetail,
  reportsUrl,
  makeChangesUrl,
  localise
}) {
  if (isDraft) {
    viewData.introText = localise('reports:view:draftIntroText', {
      dueDate: formatDate(reportDetail.dueDate)
    })
    viewData.reportsUrl = reportsUrl
  }

  if (
    isOperatorInitiatedResubmissionEnabled() &&
    reportDetail.canRequestResubmission
  ) {
    viewData.makeChangesUrl = makeChangesUrl
  }
}

function buildViewData({
  registration,
  accreditation,
  reportDetail,
  year,
  cadence,
  period,
  status,
  backUrl,
  reportsUrl,
  makeChangesUrl,
  localise
}) {
  const isDraft = status === SUBMISSION_STATUS.READY_TO_SUBMIT
  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabelWithComma(
    { year, period },
    cadence,
    localise
  )
  const { isAccredited, isExporter, isReprocessor, isRegisteredOnlyExporter } =
    buildRegistrationFlags(registration, accreditation)
  const { noteTypePlural, wasteActionGerund } =
    getNoteTypeDisplayNames(registration)
  const fallbackText = localise('reports:noneProvided')

  const viewData = {
    ...buildPageLabels({
      localise,
      periodLabel,
      noteTypePlural,
      wasteActionGerund,
      status
    }),
    ...buildStatusDetails(reportDetail, status, localise),
    isDraft,
    backUrl: isDraft ? null : backUrl,

    material,
    periodLabel,
    site: registration.site?.address?.line1,

    ...buildActivityViewData({
      reportDetail,
      isExporter,
      isAccredited,
      fallbackText
    }),

    isAccredited,
    isExporter,
    isReprocessor,
    isRegisteredOnlyExporter
  }

  applyDraftAndResubmissionExtras({
    viewData,
    isDraft,
    reportDetail,
    reportsUrl,
    makeChangesUrl,
    localise
  })

  return viewData
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const viewGetController = {
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

    const currentStatus = reportDetail.status?.currentStatus
    if (
      currentStatus !== SUBMISSION_STATUS.SUBMITTED &&
      currentStatus !== SUBMISSION_STATUS.READY_TO_SUBMIT
    ) {
      throw Boom.notFound()
    }

    const reportsPath = `/organisations/${organisationId}/registrations/${registrationId}/reports`
    const backUrl = request.localiseUrl(reportsPath)
    const reportsUrl = request.localiseUrl(reportsPath)
    const periodPath = `${reportsPath}/${year}/${cadence}/${period}/submissions/${submissionNumber}`
    const makeChangesUrl = request.localiseUrl(`${periodPath}/make-changes`)

    return h.view(
      'reports/view',
      buildViewData({
        registration,
        accreditation,
        reportDetail,
        year,
        cadence,
        period,
        status: currentStatus,
        backUrl,
        reportsUrl,
        makeChangesUrl,
        localise
      })
    )
  }
}
