import Boom from '@hapi/boom'
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
import { formatPeriodLabel } from './helpers/format-period-label.js'
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
  localise
}) {
  const isDraft = status === SUBMISSION_STATUS.READY_TO_SUBMIT
  const material = getDisplayMaterial(registration)
  const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
  const { recyclingActivity, exportActivity, wasteSent } = reportDetail
  const isAccredited = !!accreditation
  const isExporter = isExporterRegistration(registration)
  const isReprocessor = isReprocessorRegistration(registration)
  const isRegisteredOnlyExporter = isExporter && !isAccredited
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

    isAccredited,
    isExporter,
    isReprocessor,
    isRegisteredOnlyExporter,

    prn: buildPrnSummaryViewData(reportDetail.prn),

    wasteSentOn: buildWasteSentOnViewData(wasteSent, fallbackText),

    supportingInformation: reportDetail.supportingInformation || fallbackText
  }

  if (isDraft) {
    viewData.introText = localise('reports:view:draftIntroText', {
      dueDate: formatDate(reportDetail.dueDate)
    })
    viewData.reportsUrl = reportsUrl
  }

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
        localise
      })
    )
  }
}
