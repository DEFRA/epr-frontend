import { hasWriteScope } from '#server/auth/scopes.js'
import { sessionNames } from '#server/common/constants/session-names.js'
import { summaryLogStatuses } from '#server/common/constants/statuses.js'
import { fetchRegistrationAndAccreditationByNumber } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import {
  organisationPath as toOrganisationPath,
  registrationPath as toRegistrationPath
} from '#server/reports/helpers/report-paths.js'
import { requiresResubmission } from './closed-period-changes.js'
import { renderCheckView } from './check-controller.js'
import { buildValidationFailuresViewModel } from './validation-failures-view-model.js'

/**
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { TypedLogger } from '#server/common/helpers/logging/logger.js'
 * @import { RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import {
 *   LoadsByReportingPeriod,
 *   SummaryLogParams,
 *   SummaryLogStatusResponse,
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
 *   accreditationNumber?: string,
 *   loadsByReportingPeriod?: LoadsByReportingPeriod,
 *   processingType?: ProcessingType,
 *   organisationPath: string,
 *   registrationPath: string,
 *   summaryLogId: string,
 *   pollUrl: string,
 *   uploadUrl?: string,
 *   cancelUrl: string,
 *   wasteBalance?: number
 * }} RenderContext
 */

/**
 * A validated summary log's render context. The backend guarantees a processing
 * type on every validated response, so it is required here, narrowed at the
 * render boundary by toValidatedContext.
 * @typedef {RenderContext & { processingType: ProcessingType }} ValidatedRenderContext
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
 * @param {string} backendToken - Bearer token for the backend
 * @returns {Promise<SummaryLogStatusResponse>}
 */
const getStatusData = async (request, keys, summaryLogId, backendToken) => {
  /** @type {SummaryLogsSession | null} */
  const storedSession = request.yar.get(sessionNames.summaryLogs)
  const summaryLogsSession = storedSession ?? {}
  const freshDataMap = summaryLogsSession.freshDataMap
  const freshData = freshDataMap?.[summaryLogId]

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
    validation
  } = data

  return {
    accreditationNumber,
    loadsByReportingPeriod,
    processingType,
    status,
    validation
  }
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
 * @param {(key: string) => string} localise - i18n localisation function
 * @param {RenderContext} context - View context
 * @returns {ResponseObject} Hapi view response
 */
const renderSuccessView = (
  h,
  localise,
  { organisationPath, registrationPath, wasteBalance, loadsByReportingPeriod }
) => {
  return h.view(SUCCESS_VIEW_NAME, {
    pageTitle: localise('summary-log:successPageTitle'),
    organisationPath,
    registrationPath,
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
  [summaryLogStatuses.submitted]: renderSuccessView,
  [summaryLogStatuses.superseded]: renderSupersededView,
  [summaryLogStatuses.invalid]: renderValidationFailuresView,
  [summaryLogStatuses.rejected]: renderValidationFailuresView,
  [summaryLogStatuses.validationFailed]: renderValidationFailuresView,
  [summaryLogStatuses.submissionFailed]: renderValidationFailuresView
}

/**
 * Narrows a render context for a validated summary log. The backend guarantees
 * a processingType on every validated response, so a missing one is a contract
 * violation we fail loudly on here, at the boundary, rather than letting the
 * render paths treat the operator as accredited.
 * @param {RenderContext} context
 * @returns {ValidatedRenderContext}
 */
const toValidatedContext = (context) => {
  if (context.processingType === undefined) {
    throw new Error('Expected processingType for validated summary log')
  }

  return { ...context, processingType: context.processingType }
}

/**
 * Renders appropriate view based on status
 * @param {{
 *   h: ResponseToolkit,
 *   localise: (key: string, params?: object) => string
 * } & RenderContext} options - Rendering options
 * @returns {ResponseObject} Hapi view response
 */
const renderViewForStatus = (options) => {
  const { h, localise, status } = options

  if (status === summaryLogStatuses.validated) {
    return renderCheckView(h, localise, toValidatedContext(options))
  }

  const resolver = viewResolvers[status] ?? renderProgressView

  return resolver(h, localise, options)
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

  const { accreditation } = await fetchRegistrationAndAccreditationByNumber(
    keys.organisationNumber,
    keys.registrationNumber,
    session
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
 * Determines whether the current waste balance is needed for this render: after
 * submission (success page), or on the check page where it drives the
 * projected balance panel.
 * @param {string} status - Current summary log status
 * @returns {boolean}
 */
const needsWasteBalance = (status) =>
  status === summaryLogStatuses.submitted ||
  status === summaryLogStatuses.validated

/**
 * Gets waste balance data for a submitted summary log, or for the check page
 * where it drives the projected balance panel.
 * @param {string} status - Current summary log status
 * @param {RegistrationKeys} keys
 * @param {UserSession} session
 * @param {TypedLogger} logger - Request logger
 * @returns {Promise<{wasteBalance?: number}>} Waste balance, or empty object if not applicable
 */
const getWasteBalanceData = async (status, keys, session, logger) => {
  if (!needsWasteBalance(status)) {
    return {}
  }

  try {
    const { organisationData, registration } =
      await fetchRegistrationAndAccreditationByNumber(
        keys.organisationNumber,
        keys.registrationNumber,
        session
      )

    if (!registration.accreditationId) {
      return {}
    }

    const wasteBalances = await fetchWasteBalances(
      organisationData.id,
      [registration.accreditationId],
      session.backendToken
    )

    const balance = wasteBalances[registration.accreditationId]

    if (!balance) {
      return {}
    }

    return { wasteBalance: balance.availableAmount }
  } catch (error) {
    if (error.isBoom) {
      throw error
    }
    logger.error({ message: 'Failed to fetch waste balance data', err: error })
    return {}
  }
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
      validation
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

    const { wasteBalance } = await getWasteBalanceData(
      status,
      keys,
      session,
      request.logger
    )

    return renderViewForStatus({
      h,
      localise,
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
      wasteBalance
    })
  }
}

/**
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */
