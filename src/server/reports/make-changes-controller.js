import Boom from '@hapi/boom'
import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'

import { isOperatorInitiatedResubmissionEnabled } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabelWithComma } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { requestResubmission } from './helpers/request-resubmission.js'
import { SUBMISSION_STATUS } from './constants.js'

const payloadSchema = Joi.object({
  crumb: Joi.string()
})

/**
 * @param {HapiRequest & { params: PeriodParams }} request
 */
function buildPaths(request) {
  const {
    organisationId,
    registrationId,
    year,
    cadence,
    period,
    submissionNumber
  } = request.params
  const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports`
  const periodPath = `${basePath}/${year}/${cadence}/${period}/submissions/${submissionNumber}`

  return {
    viewPath: `${periodPath}/view`,
    periodPath,
    // requestResubmission only flags the submitted report (submissionNumber);
    // it doesn't create the draft. The draft is submissionNumber + 1, created
    // lazily the same way the resubmission-explainer flow creates it — by
    // GETting its period path, which detailController renders for a report
    // that doesn't exist yet.
    nextSubmissionPeriodPath: `${basePath}/${year}/${cadence}/${period}/submissions/${submissionNumber + 1}`
  }
}

/**
 * Resolves the "update your data" copy for the note-type and summary-log
 * sections. Accredited operators are told about their PRNs/PERNs; registered-
 * only operators have no note data, so they are pointed at the tonnage figures
 * they do have (recycled for reprocessors, received for exporters).
 * @param {{
 *   isAccredited: boolean,
 *   isExporter: boolean,
 *   localise: Localise,
 *   noteTypePlural: string,
 *   periodLabel: string,
 *   wasteDataWord: string
 * }} params
 */
function buildDataUpdateCopy({
  localise,
  isAccredited,
  isExporter,
  noteTypePlural,
  wasteDataWord,
  periodLabel
}) {
  if (isAccredited) {
    return {
      dataUpdateHeading: localise(
        'reports:makeChangesUpdateNoteTypeOnlyHeading',
        { noteTypePlural }
      ),
      dataUpdateText: localise('reports:makeChangesUpdateNoteTypeOnlyText', {
        noteTypePlural
      }),
      summaryLogText: localise('reports:makeChangesUpdateSummaryLogText', {
        noteTypePlural
      })
    }
  }

  return {
    dataUpdateHeading: localise(
      'reports:makeChangesUpdateWasteDataOnlyHeading',
      { wasteDataWord }
    ),
    dataUpdateText: localise(
      isExporter
        ? 'reports:makeChangesUpdateWasteDataOnlyTextExporter'
        : 'reports:makeChangesUpdateWasteDataOnlyTextReprocessor',
      { periodLabel }
    ),
    summaryLogText: localise('reports:makeChangesUpdateSummaryLogTextRegOnly', {
      wasteDataWord
    })
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const makeChangesGetController = {
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
    if (!isOperatorInitiatedResubmissionEnabled()) {
      throw Boom.notFound()
    }

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

    if (
      reportDetail.status?.currentStatus !== SUBMISSION_STATUS.SUBMITTED ||
      !reportDetail.canRequestResubmission
    ) {
      throw Boom.notFound()
    }

    const periodLabel = formatPeriodLabelWithComma(
      { year, period },
      cadence,
      localise
    )
    const { noteTypePlural, isExporter } = getNoteTypeDisplayNames(registration)
    const { viewPath } = buildPaths(request)
    const dataUpdateCopy = buildDataUpdateCopy({
      isAccredited: !!accreditation,
      isExporter,
      localise,
      noteTypePlural,
      periodLabel,
      wasteDataWord: isExporter ? 'received' : 'recycled'
    })

    return h.view('reports/make-changes', {
      pageTitle: localise('reports:makeChangesPageTitle', { periodLabel }),
      periodLabel,
      ...dataUpdateCopy,
      backUrl: request.localiseUrl(viewPath),
      uploadUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/upload`
      )
    })
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const makeChangesPostController = {
  options: {
    validate: {
      params: periodParamsSchema,
      payload: payloadSchema
    }
  },
  /**
   * @param {HapiRequest & { params: PeriodParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    if (!isOperatorInitiatedResubmissionEnabled()) {
      throw Boom.notFound()
    }

    const {
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const session = request.auth.credentials
    const { nextSubmissionPeriodPath, viewPath } = buildPaths(request)

    try {
      await requestResubmission(
        {
          organisationId,
          registrationId,
          year,
          cadence,
          period,
          submissionNumber
        },
        session.idToken
      )
    } catch (error) {
      const boomError = /** @type {BoomError} */ (error)
      const isConflict =
        boomError.isBoom && boomError.output.statusCode === StatusCodes.CONFLICT

      if (!isConflict) {
        throw error
      }

      return h.redirect(request.localiseUrl(viewPath))
    }

    return h.redirect(request.localiseUrl(nextSubmissionPeriodPath))
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { Boom as BoomError } from '@hapi/boom'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { Localise } from './helpers/format-period-label.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
