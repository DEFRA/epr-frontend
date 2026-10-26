import { isRegisteredOnlyProcessingType } from '#domain/summary-logs/meta-fields.js'
import { hasWriteScope } from '#server/auth/scopes.js'
import { sessionNames } from '#server/common/constants/session-names.js'
import { summaryLogStatuses } from '#server/common/constants/statuses.js'
import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { fetchAccreditationBalance } from '#server/common/helpers/waste-balance/fetch-accreditation-balance.js'
import { toYear } from '#server/common/helpers/year.js'
import {
  organisationPath as toOrganisationPath,
  registrationPath as toRegistrationPath
} from '#server/reports/helpers/report-paths.js'
import { requiresResubmission } from './closed-period-changes.js'
import { renderCheckView } from './check-controller.js'
import { buildValidationFailuresViewModel } from './validation-failures-view-model.js'

/**
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { AccreditationNumber } from '#server/common/helpers/accreditation-number.js'
 * @import { BackendToken } from '#server/common/helpers/backend-token.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import {
 *   LoadsByReportingPeriod,
 *   StoredSummaryLog,
 *   SummaryLogParams,
 *   SummaryLogsSession,
 *   ValidationResponse
 * } from './types.js'
 */

/**
 * Context passed to every view resolver. Fields populated depend on the
 * backend status, so all data-bearing properties are optional and each
 * resolver destructures only what it needs.
 * @typedef {{
 *   status: string,
 *   validation?: ValidationResponse,
 *   accreditationNumber?: AccreditationNumber,
 *   loadsByReportingPeriod?: LoadsByReportingPeriod,
 *   processingType?: ProcessingType,
 *   organisationPath: string,
 *   registrationPath: string,
 *   summaryLogId: string,
 *   pollUrl: string,
 *   uploadUrl?: string,
 *   cancelUrl: string,
 *   wasteBalance?: number,
 *   year?: number
 * }} RenderContext
 */

/**
 * A summary log's status as the page reads it: the submit response kept in the
 * session carries the status alone, and the placeholder for one not yet stored
 * no year, so the stored fields are optional here.
 * @typedef {Partial<StoredSummaryLog> & { status: string }} StatusData
 */

/**
 * The render context of a summary log that passed validation, whether validated
 * or submitted. The backend guarantees its processing type and year, so both
 * are required here, narrowed at the render boundary by toValidatedContext.
 * @typedef {RenderContext & { processingType: ProcessingType, year: Year }} ValidatedRenderContext
 */

const PROCESSING_STATES = new Set([
  summaryLogStatuses.preprocessing,
  summaryLogStatuses.validating,
  summaryLogStatuses.submitting
])

const REUPLOAD_STATES = new Set([
  summaryLogStatuses.invalid,
  summaryLogStatuses.rejected,
  summaryLogStatuses.validationFailed,
  summaryLogStatuses.submissionFailed
])

const VIEW_NAME = 'summary-log/progress'
const SUBMITTING_VIEW_NAME = 'summary-log/submitting'
const SUCCESS_VIEW_NAME = 'summary-log/success'
const SUPERSEDED_VIEW_NAME = 'summary-log/superseded'
const VALIDATION_FAILURES_VIEW_NAME = 'summary-log/validation-failures'
const PAGE_TITLE_KEY = 'summary-log:pageTitle'

/**
 * Gets view data for progress page (processing or error states)
 * @param {(key: string) => string} localise - The i18n translation function
 * @param {string} status - Backend status
 * @returns {{heading: string, message: string, isProcessing: boolean}}
 */
const getProgressViewData = (localise, status) => {
  if (PROCESSING_STATES.has(status)) {
    return {
      heading: localise('summary-log:processingHeading'),
      message: localise('summary-log:processingMessage'),
      isProcessing: true
    }
  }

  // Fallback for unexpected statuses (should not occur in normal flow)
  return {
    heading: localise('summary-log:errorHeading'),
    message: localise('summary-log:errorMessage'),
    isProcessing: false
  }
}

/**
 * Gets status data from session (if fresh) or backend API
 * @param {HapiRequest} request - Hapi request object
 * @param {RegistrationKeys} keys
 * @param {string} summaryLogId - Summary log ID
 * @param {BackendToken} backendToken
 * @returns {Promise<StatusData>}
 */
const getStatusData = async (request, keys, summaryLogId, backendToken) => {
  /** @type {SummaryLogsSession | null} */
  const storedSession = request.yar.get(sessionNames.summaryLogs)
  const summaryLogsSession = storedSession ?? {}
  const freshDataMap = summaryLogsSession.freshDataMap
  const freshData = freshDataMap?.[summaryLogId]

  /** @type {StatusData} */
  const data =
    freshData ??
    (await fetchSummaryLogStatus(keys, summaryLogId, { backendToken }))

  if (freshDataMap !== undefined && summaryLogId in freshDataMap) {
    const { [summaryLogId]: _, ...remainingMap } = freshDataMap // NOSONAR(javascript:S1481) intentional discard via destructure-rest
    request.yar.set(sessionNames.summaryLogs, {
      ...summaryLogsSession,
      freshDataMap: remainingMap
    })
  }

  const {
    accreditationNumber,
    loadsByReportingPeriod,
    processingType,
    status,
    validation,
    year
  } = data

  return {
    accreditationNumber,
    loadsByReportingPeriod,
    processingType,
    status,
    validation,
    year
  }
}

/**
 * The submit response carries no year, but every summary log the backend
 * serves does, so a missing year where one is read is a contract violation.
 * @param {number | undefined} value
 * @returns {Year}
 */
const requiredYear = (value) => {
  if (value === undefined) {
    throw new Error('Expected year for summary log')
  }

  return toYear(value)
}

/**
 * Renders the submitting page while submission is in progress
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderSubmittingView = (h, localise, { pollUrl }) => {
  return h.view(SUBMITTING_VIEW_NAME, {
    pageTitle: localise(PAGE_TITLE_KEY),
    heading: localise('summary-log:submittingHeading'),
    message: localise('summary-log:submittingMessage'),
    isProcessing: true,
    shouldPoll: true,
    pollUrl
  })
}

/**
 * Renders the success page after successful submission
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string, params?: object) => string} localise - i18n localisation function
 * @param {ValidatedRenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderSuccessView = (
  h,
  localise,
  {
    organisationPath,
    registrationPath,
    wasteBalance,
    loadsByReportingPeriod,
    year
  }
) => {
  const heading = localise('summary-log:successHeading', { year })

  return h.view(SUCCESS_VIEW_NAME, {
    pageTitle: heading,
    heading,
    organisationPath,
    registrationPath,
    reportsUrl: `${registrationPath}/reports/${year}`,
    wasteBalance,
    showFurtherAction: requiresResubmission(loadsByReportingPeriod)
  })
}

/**
 * Renders the superseded page for summary logs replaced by a newer upload
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderSupersededView = (
  h,
  localise,
  { organisationPath, registrationPath }
) => {
  return h.view(SUPERSEDED_VIEW_NAME, {
    pageTitle: localise(PAGE_TITLE_KEY),
    organisationPath,
    registrationPath
  })
}

/**
 * Renders the validation failures page for invalid summary logs
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string, params?: object) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderValidationFailuresView = (
  h,
  localise,
  { validation, uploadUrl, cancelUrl }
) => {
  const { errorRecords, issues, description1, description2 } =
    buildValidationFailuresViewModel(localise, validation)

  return h.view(VALIDATION_FAILURES_VIEW_NAME, {
    pageTitle: localise(PAGE_TITLE_KEY),
    heading: localise('summary-log:validationFailuresHeading'),
    description1,
    description2,
    errorRecords,
    issues,
    fileUploadLabel: localise('summary-log:reuploadFileLabel'),
    buttonText: localise('summary-log:reuploadButtonText'),
    cancelUrl,
    cancelButtonText: localise('summary-log:cancelButtonText'),
    uploadUrl
  })
}

/**
 * Renders the progress page for processing states or unexpected statuses
 * @param {ResponseToolkit} h - Hapi response toolkit
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderProgressView = (h, localise, { status, pollUrl }) => {
  const viewData = getProgressViewData(localise, status)

  return h.view(VIEW_NAME, {
    ...viewData,
    pageTitle: localise(PAGE_TITLE_KEY),
    shouldPoll: PROCESSING_STATES.has(status),
    pollUrl
  })
}

/**
 * View resolver mapping - maps backend statuses to their render functions
 * @type {Record<string, (
 *   h: ResponseToolkit,
 *   localise: (key: string, params?: object) => string,
 *   context: RenderContext
 * ) => ResponseObject>}
 */
const viewResolvers = {
  [summaryLogStatuses.submitting]: renderSubmittingView,
  [summaryLogStatuses.superseded]: renderSupersededView,
  [summaryLogStatuses.invalid]: renderValidationFailuresView,
  [summaryLogStatuses.rejected]: renderValidationFailuresView,
  [summaryLogStatuses.validationFailed]: renderValidationFailuresView,
  [summaryLogStatuses.submissionFailed]: renderValidationFailuresView
}

/**
 * Narrows the render context of a summary log that passed validation. A missing
 * processing type or year is a contract violation we fail loudly on here, at
 * the boundary, rather than letting the render paths treat the operator as
 * accredited or link to no year.
 * @param {RenderContext} context
 * @returns {ValidatedRenderContext}
 */
const toValidatedContext = (context) => {
  if (context.processingType === undefined) {
    throw new Error('Expected processingType for validated summary log')
  }

  return {
    ...context,
    processingType: context.processingType,
    year: requiredYear(context.year)
  }
}

const PASSED_VALIDATION_STATES = new Set([
  summaryLogStatuses.validated,
  summaryLogStatuses.submitted
])

/**
 * Renders the check page or the success page.
 * @param {ResponseToolkit} h
 * @param {(key: string, params?: object) => string} localise
 * @param {RenderContext} renderContext
 * @param {{ keys: RegistrationKeys, session: UserSession, logger: TypedLogger }} reader
 * @returns {Promise<ResponseObject>}
 */
const renderPassedValidationView = async (
  h,
  localise,
  renderContext,
  { keys, session, logger }
) => {
  const context = toValidatedContext(renderContext)

  const { wasteBalance } = isRegisteredOnlyProcessingType(
    context.processingType
  )
    ? {}
    : await getWasteBalanceData(keys, context.year, session, logger)

  const render =
    context.status === summaryLogStatuses.validated
      ? renderCheckView
      : renderSuccessView

  return render(h, localise, {
    ...context,
    organisationPath: `${context.organisationPath}/${context.year}`,
    wasteBalance
  })
}

/**
 * Gets a pre-signed upload URL for re-uploading a summary log.
 * @param {string} status - Current summary log status
 * @param {RegistrationKeys} keys
 * @param {string} redirectUrl - URL to redirect to after upload (with {summaryLogId} placeholder)
 * @param {UserSession} session
 * @returns {Promise<{uploadUrl?: string}>} Upload URL, or empty object if not needed
 */
const getUploadUrl = async (status, keys, redirectUrl, session) => {
  if (!REUPLOAD_STATES.has(status)) {
    return {}
  }

  const { accreditation } = await fetchRegistrationWithAccreditation(
    keys,
    session.backendToken
  )

  const { uploadUrl } = await initiateSummaryLogUpload({
    keys,
    accredited: accreditation !== undefined,
    redirectUrl,
    backendToken: session.backendToken
  })

  return { uploadUrl }
}

/**
 * The current balance of the operator's accreditation for the summary log's
 * year, or an empty object when it has no live one.
 * @param {RegistrationKeys} keys
 * @param {Year} summaryLogYear
 * @param {UserSession} session
 * @param {TypedLogger} logger - Request logger
 * @returns {Promise<{wasteBalance?: number}>}
 */
const getWasteBalanceData = async (keys, summaryLogYear, session, logger) => {
  const { organisation, accreditation } =
    await fetchRegistrationWithAccreditation(
      { ...keys, year: summaryLogYear },
      session.backendToken
    )

  if (!accreditation) {
    return {}
  }

  const balance = await fetchAccreditationBalance({
    organisationNumber: organisation.organisationNumber,
    year: summaryLogYear,
    accreditationNumber: accreditation.accreditationNumber,
    backendToken: session.backendToken,
    logger
  })

  return balance ? { wasteBalance: balance.availableAmount } : {}
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const summaryLogUploadProgressController = {
  /**
   * @param {HapiRequest & { params: SummaryLogParams }} request
   * @param {ResponseToolkit} h
   */
  handler: async (request, h) => {
    const localise = request.t
    const { summaryLogId, ...keys } = request.params

    const session = request.auth.credentials

    const {
      accreditationNumber,
      loadsByReportingPeriod,
      processingType,
      status,
      validation,
      year
    } = await getStatusData(request, keys, summaryLogId, session.backendToken)

    const registrationPath = toRegistrationPath(keys)
    const pollUrl = `${registrationPath}/summary-logs/${summaryLogId}`
    const redirectUrl = `${registrationPath}/summary-logs/{summaryLogId}`
    const cancelUrl = registrationPath

    // Asking for an upload URL creates a summary log, so this GET writes. A
    // session holding no write scope reads the page without one; the re-upload
    // form is hidden.
    const { uploadUrl } = hasWriteScope(session)
      ? await getUploadUrl(status, keys, redirectUrl, session)
      : {}

    /** @type {RenderContext} */
    const context = {
      status,
      validation,
      accreditationNumber,
      loadsByReportingPeriod,
      processingType,
      organisationPath: toOrganisationPath(keys),
      registrationPath,
      summaryLogId,
      pollUrl,
      uploadUrl,
      cancelUrl,
      year
    }

    if (PASSED_VALIDATION_STATES.has(status)) {
      return renderPassedValidationView(h, localise, context, {
        keys,
        session,
        logger: request.logger
      })
    }

    const resolver = viewResolvers[status] ?? renderProgressView

    return resolver(h, localise, context)
  }
}

/**
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */
