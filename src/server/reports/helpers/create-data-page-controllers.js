import { fetchReportDetail } from './fetch-report-detail.js'
import { formatPeriodShort } from './format-period-label.js'
import { periodParamsSchema } from './period-params-schema.js'
import { getRedirectUrl } from './redirect.js'
import { updateReport } from './update-report.js'
import { buildValidationErrors } from './validation.js'

/**
 * @param {GuardFn} guardFn
 * @param {PageFieldsBuilder} pageFields
 * @param {GuardOptions} guardOptions
 * @param {HapiRequest} request
 * @param {GuardOptions} [options]
 * @returns {Promise<ViewData>}
 */
function buildViewData(guardFn, pageFields, guardOptions, request, options) {
  return guardFn(
    request,
    (ctx) => {
      const fields = pageFields(ctx)(request.t)
      fields.backUrl = request.localiseUrl(fields.backUrl)
      return fields
    },
    { ...options, ...guardOptions }
  )
}

/**
 * Creates GET and POST controllers for a data-entry page.
 *
 * Every data page shares the same structure: validate params, build view
 * data from a guard function + page fields, render a template. This factory
 * extracts that boilerplate so each page only supplies its unique config.
 *
 * POST handler modes:
 * - `exceedsTotalErrorKey` + `nextPage` — validates free tonnage against issued, then saves
 * - `nextPage` alone — simple save-and-redirect
 * @param {{
 *   viewPath: string,
 *   fieldName: string,
 *   payloadSchema: import('joi').Schema,
 *   pageFields: PageFieldsBuilder,
 *   guardFn: GuardFn,
 *   guardOptions?: GuardOptions,
 *   nextPage: NextPage,
 *   exceedsTotalErrorKey?: string
 * }} config
 * @returns {{ getController: DataPageController, postController: DataPagePostController }}
 */
export function createDataPageControllers({
  viewPath,
  fieldName,
  payloadSchema,
  pageFields,
  guardFn,
  guardOptions = {},
  nextPage,
  exceedsTotalErrorKey
}) {
  /** @type {GetViewData} */
  const getViewData = (request, options = {}) =>
    buildViewData(guardFn, pageFields, guardOptions, request, options)

  const getController = {
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
      const viewData = await getViewData(request)
      return h.view(viewPath, viewData)
    }
  }

  const postHandler = exceedsTotalErrorKey
    ? createTonnagePostHandler(
        fieldName,
        nextPage,
        exceedsTotalErrorKey,
        getViewData,
        viewPath
      )
    : createSimplePostHandler(fieldName, nextPage)

  const postController = {
    options: {
      validate: {
        params: periodParamsSchema,
        payload: payloadSchema,
        /**
         * @param {DataPagePostRequest} request
         * @param {ResponseToolkit} h
         * @param {Error | undefined} error Hapi's failAction contract — with
         *   payload validation configured this is always the Joi ValidationError.
         */
        async failAction(request, h, error) {
          const viewData = await getViewData(request, {
            value: request.payload[fieldName]
          })

          const { errors, errorSummary } = buildValidationErrors(
            request,
            /** @type {import('joi').ValidationError} */ (error),
            { noteTypePlural: viewData.noteTypePlural }
          )

          return h
            .view(viewPath, { ...viewData, errors, errorSummary })
            .takeover()
        }
      }
    },
    handler: postHandler
  }

  return { getController, postController }
}

/**
 * @param {NextPage} nextPage
 * @param {DataPagePostRequest} request
 * @returns {string}
 */
const resolveNextPage = (nextPage, request) =>
  typeof nextPage === 'function' ? nextPage(request) : nextPage

/**
 * @param {string} fieldName
 * @param {NextPage} nextPage
 * @returns {(
 *   request: DataPagePostRequest,
 *   h: ResponseToolkit
 * ) => Promise<ResponseObject>}
 */
function createSimplePostHandler(fieldName, nextPage) {
  return async (request, h) => {
    const fieldValue = request.payload[fieldName]

    if (fieldValue !== undefined) {
      const {
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        submissionNumber
      } = request.params

      await updateReport(
        {
          organisationId,
          registrationId,
          year,
          cadence,
          period,
          submissionNumber
        },
        { [fieldName]: fieldValue },
        request.auth.credentials.idToken
      )
    }

    return h.redirect(
      getRedirectUrl(
        request,
        request.params,
        request.payload.action,
        resolveNextPage(nextPage, request)
      )
    )
  }
}

/**
 * @param {DataPagePostRequest} request
 * @param {ResponseToolkit} h
 * @param {{
 *   errorKey: string,
 *   fieldName: string,
 *   fieldValue: number,
 *   getViewData: GetViewData,
 *   viewPath: string
 * }} options
 * @returns {Promise<ResponseObject>}
 */
const renderExceedsTotalError = async (
  request,
  h,
  { errorKey, fieldName, fieldValue, getViewData, viewPath }
) => {
  const { year, cadence, period } = request.params
  const viewData = await getViewData(request, { value: fieldValue })
  const periodShort = formatPeriodShort({ year, period }, cadence, request.t)
  const message = request.t(errorKey, {
    noteTypePlural: viewData.noteTypePlural,
    periodShort
  })

  return h.view(viewPath, {
    ...viewData,
    errors: {
      [fieldName]: { text: message }
    },
    errorSummary: {
      titleText: request.t('common:errorSummaryTitle'),
      errorList: [{ text: message, href: `#${fieldName}` }]
    }
  })
}

/**
 * Creates a POST handler that validates free tonnage does not exceed the
 * total issued tonnage before saving.
 * @param {string} fieldName
 * @param {NextPage} nextPage
 * @param {string} errorKey - i18n key for the exceeds-total error message
 * @param {GetViewData} getViewData
 * @param {string} viewPath
 * @returns {(
 *   request: DataPagePostRequest,
 *   h: ResponseToolkit
 * ) => Promise<ResponseObject>}
 */
function createTonnagePostHandler(
  fieldName,
  nextPage,
  errorKey,
  getViewData,
  viewPath
) {
  return async (request, h) => {
    const {
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const fieldValue = /** @type {number | undefined} */ (
      request.payload[fieldName]
    )
    const session = request.auth.credentials

    if (fieldValue === undefined) {
      return h.redirect(
        getRedirectUrl(
          request,
          request.params,
          request.payload.action,
          resolveNextPage(nextPage, request)
        )
      )
    }

    const reportDetail = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber,
      session.idToken
    )

    const prn = /** @type {NonNullable<typeof reportDetail.prn>} */ (
      reportDetail.prn
    )

    if (fieldValue > prn.issuedTonnage) {
      return renderExceedsTotalError(request, h, {
        fieldName,
        errorKey,
        fieldValue,
        getViewData,
        viewPath
      })
    }

    await updateReport(
      {
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        submissionNumber
      },
      { [fieldName]: fieldValue },
      session.idToken
    )

    return h.redirect(
      getRedirectUrl(
        request,
        request.params,
        request.payload.action,
        resolveNextPage(nextPage, request)
      )
    )
  }
}

/**
 * Payload shape shared by every page built via `createDataPageControllers`.
 * The `fieldName` key is validated by the page-specific payloadSchema.
 * @typedef {{
 *   action: 'continue' | 'save',
 *   crumb?: string,
 *   [field: string]: unknown
 * }} DataPagePayload
 */

/**
 * @typedef {HapiRequest & { params: PeriodParams, payload: DataPagePayload }} DataPagePostRequest
 */

/**
 * @typedef {string | ((request: DataPagePostRequest) => string)} NextPage
 */

/**
 * @typedef {(
 *   request: HapiRequest & { params: PeriodParams },
 *   options?: GuardOptions
 * ) => Promise<ViewData>} GetViewData
 */

/**
 * @typedef {{
 *   options: { validate: { params: import('joi').Schema } },
 *   handler: (
 *     request: HapiRequest & { params: PeriodParams },
 *     h: ResponseToolkit
 *   ) => Promise<ResponseObject>
 * }} DataPageController
 */

/**
 * @typedef {{
 *   options: {
 *     validate: {
 *       params: import('joi').Schema,
 *       payload: import('joi').Schema,
 *       failAction: (
 *         request: DataPagePostRequest,
 *         h: ResponseToolkit,
 *         error: Error | undefined
 *       ) => Promise<ResponseObject>
 *     }
 *   },
 *   handler: (
 *     request: DataPagePostRequest,
 *     h: ResponseToolkit
 *   ) => Promise<ResponseObject>
 * }} DataPagePostController
 */

/**
 * @import { ResponseObject, ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { GuardFn, GuardOptions, PageFieldsBuilder, ViewData } from './create-page-guards.js'
 * @import { PeriodParams } from './period-params-schema.js'
 */
