import Boom from '@hapi/boom'
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import {
  buildDestinationDetailRows,
  buildSupplierDetailRows,
  buildUnapprovedOverseasSiteRows,
  getTotalTonnageSentOn
} from './helpers/build-table-rows.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import {
  getNoteTypeDisplayNames,
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { SUBMISSION_STATUS } from './constants.js'

/**
 * @param {{ localise: (key: string, params?: Record<string, string>) => string, periodLabel: string, noteTypePlural: string, wasteActionGerund: string, status: import('./constants.js').SubmissionStatusValue }} params
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
    freeLabel: localise('reports:view:freeLabel', { noteTypePlural }),
    revenueLabel: localise('reports:view:totalRevenue', { noteTypePlural }),
    avgPriceLabel: localise('reports:view:avgPrice', { noteTypePlural })
  }
}

/**
 * @param {object} reportDetail
 * @param {import('./constants.js').SubmissionStatusValue} status
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
  const { noteTypePlural, wasteActionGerund } =
    getNoteTypeDisplayNames(registration)

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

    wasteReceived: {
      totalTonnage: formatTonnage(recyclingActivity.totalTonnageReceived),
      supplierDetailRows: buildSupplierDetailRows(recyclingActivity.suppliers)
    },

    packagingWasteRecycling: {
      tonnageRecycled: formatTonnage(recyclingActivity.tonnageRecycled),
      tonnageNotRecycled: formatTonnage(recyclingActivity.tonnageNotRecycled)
    },

    wasteExported: buildWasteExported(exportActivity, isExporter, isAccredited),

    isAccredited,
    isExporter,
    isReprocessor,

    prn: {
      issuedTonnage: reportDetail.prn?.issuedTonnage,
      freeTonnage: reportDetail.prn?.freeTonnage,
      totalRevenue: reportDetail.prn?.totalRevenue,
      averagePricePerTonne: reportDetail.prn?.averagePricePerTonne
    },

    wasteSentOn: {
      totalTonnage: formatTonnage(getTotalTonnageSentOn(wasteSent)),
      toReprocessors: formatTonnage(wasteSent.tonnageSentToReprocessor),
      toExporters: formatTonnage(wasteSent.tonnageSentToExporter),
      toOtherSites: formatTonnage(wasteSent.tonnageSentToAnotherSite),
      destinationDetailRows: buildDestinationDetailRows(
        wasteSent.finalDestinations
      )
    },

    supportingInformation:
      reportDetail.supportingInformation ||
      localise('reports:supportingInformationNone')
  }

  if (isDraft) {
    viewData.introText = localise('reports:view:draftIntroText', {
      dueDate: formatDate(reportDetail.dueDate)
    })
    viewData.reportsUrl = reportsUrl
  }

  return viewData
}

function buildWasteExported(exportActivity, isExporter, isAccredited) {
  if (!isExporter || !exportActivity) {
    return null
  }

  return {
    totalTonnage: formatTonnage(exportActivity.totalTonnageExported),
    overseasSiteRows: exportActivity.overseasSites.map((overseasSite) => {
      const row = [
        { text: overseasSite.siteName },
        { text: overseasSite.orsId },
        { text: overseasSite.country }
      ]

      if (isAccredited) {
        row.push({ text: overseasSite.approved ? '✓' : '' })
      }

      return row
    }),
    unapprovedOverseasSiteRows: buildUnapprovedOverseasSiteRows(
      exportActivity.unapprovedOverseasSites
    ),
    tonnageReceivedNotExported: formatTonnage(
      exportActivity.tonnageReceivedNotExported
    ),
    tonnageRefusedOrStopped: formatTonnage(
      exportActivity.totalTonnageRefusedOrStopped
    ),
    tonnageRefused: formatTonnage(exportActivity.tonnageRefusedAtDestination),
    tonnageStopped: formatTonnage(exportActivity.tonnageStoppedDuringExport),
    tonnageRepatriated: formatTonnage(exportActivity.tonnageRepatriated)
  }
}

/**
 * @satisfies {Partial<import('@hapi/hapi').ServerRoute>}
 */
export const viewGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
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
