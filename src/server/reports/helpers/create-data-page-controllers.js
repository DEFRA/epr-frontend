import { fetchReportDetail } from './fetch-report-detail.js'
import { formatPeriodShort } from './format-period-label.js'
import { periodParamsSchema } from './period-params-schema.js'
import { getRedirectUrl } from './redirect.js'
import { updateReport } from './update-report.js'
import { buildValidationErrors } from './validation.js'

/**
 * Builds view data by calling the guard function with a page-fields callback.
 * @param {(request: HapiRequest, buildPageFields: (ctx: object) => object, options: object) => Promise<object>} guardFn
 * @param {(ctx: object) => (localise: (key: string, params?: object) => string) => object} pageFields
 * @param {object} guardOptions
 * @param {HapiRequest} request
 * @param {object} [options]
 * @returns {Promise<object>}
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
 * POST handler modes (mutually exclusive, checked in order):
 * - `createPostHandler` — full custom handler, receives `{ getViewData, viewPath }`
 * - `exceedsTotalErrorKey` + `nextPage` — validates free tonnage against issued, then saves
 * - `nextPage` alone — simple save-and-redirect
 * @param {object} config
 * @param {string} config.viewPath - Nunjucks template path
 * @param {string} config.fieldName - Payload field name
 * @param {import('joi').Schema} config.payloadSchema - Joi schema for POST payload
 * @param {(ctx: object) => (localise: (key: string, params?: object) => string) => object} config.pageFields - Returns localised page fields from context
 * @param {(request: HapiRequest, buildPageFields: (ctx: object) => object, options: object) => Promise<object>} config.guardFn - Guard function (buildExporterViewData or buildReprocessorViewData)
 * @param {object} [config.guardOptions] - Extra options passed to guardFn (e.g. { accreditedOnly: true })
 * @param {string} [config.nextPage] - Redirect target after saving
 * @param {string} [config.exceedsTotalErrorKey] - i18n key for the exceeds-total error (enables tonnage validation)
 * @param {(deps: { getViewData: (request: HapiRequest, options?: object) => Promise<object>, viewPath: string }) => (request: HapiRequest & { params: PeriodParams, payload: DataPagePayload }, h: ResponseToolkit) => Promise<ResponseObject>} [config.createPostHandler] - Factory for custom POST handler
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
  exceedsTotalErrorKey,
  createPostHandler
}) {
  /**
   * @param {HapiRequest & { params: PeriodParams }} request
   * @param {object} [options]
   */
  const getViewData = (request, options = {}) =>
    buildViewData(guardFn, pageFields, guardOptions, request, options)

  /** @satisfies {Partial<ServerRoute>} */
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

  let postHandler
  if (createPostHandler) {
    postHandler = createPostHandler({ getViewData, viewPath })
  } else if (exceedsTotalErrorKey) {
    postHandler = createTonnagePostHandler(
      fieldName,
      /** @type {string} */ (nextPage),
      exceedsTotalErrorKey,
      getViewData,
      viewPath
    )
  } else {
    postHandler = createSimplePostHandler(
      fieldName,
      /** @type {string} */ (nextPage)
    )
  }

  /** @satisfies {Partial<ServerRoute>} */
  const postController = {
    options: {
      validate: {
        params: periodParamsSchema,
        payload: payloadSchema,
        /**
         * @param {HapiRequest & { params: PeriodParams, payload: DataPagePayload }} request
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
 * @param {string} fieldName
 * @param {string} nextPage
 * @returns {(request: HapiRequest & { params: PeriodParams, payload: DataPagePayload }, h: ResponseToolkit) => Promise<ResponseObject>}
 */
function createSimplePostHandler(fieldName, nextPage) {
  return async (request, h) => {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const fieldValue = request.payload[fieldName]
    const session = request.auth.credentials

    if (fieldValue !== undefined) {
      await updateReport(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        { [fieldName]: fieldValue },
        session.idToken
      )
    }

    return h.redirect(
      getRedirectUrl(request, request.params, request.payload.action, nextPage)
    )
  }
}

/**
 * Creates a POST handler that validates free tonnage does not exceed the
 * total issued tonnage before saving.
 * @param {string} fieldName
 * @param {string} nextPage
 * @param {string} errorKey - i18n key for the exceeds-total error message
 * @param {(request: HapiRequest & { params: PeriodParams }, options?: object) => Promise<object>} getViewData
 * @param {string} viewPath
 * @returns {(request: HapiRequest & { params: PeriodParams, payload: DataPagePayload }, h: ResponseToolkit) => Promise<ResponseObject>}
 */
function createTonnagePostHandler(
  fieldName,
  nextPage,
  errorKey,
  getViewData,
  viewPath
) {
  return async (request, h) => {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
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
          nextPage
        )
      )
    }

    const reportDetail = await fetchReportDetail(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      session.idToken
    )

    const prn = /** @type {NonNullable<typeof reportDetail.prn>} */ (
      reportDetail.prn
    )

    if (fieldValue > prn.issuedTonnage) {
      const viewData = await getViewData(request, { value: fieldValue })
      const periodShort = formatPeriodShort(
        { year, period },
        cadence,
        request.t
      )
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

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { [fieldName]: fieldValue },
      session.idToken
    )

    return h.redirect(
      getRedirectUrl(request, request.params, request.payload.action, nextPage)
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
 * @typedef {{
 *   options: { validate: { params: import('joi').Schema } },
 *   handler: (request: HapiRequest & { params: PeriodParams }, h: ResponseToolkit) => Promise<ResponseObject>
 * }} DataPageController
 */

/**
 * @typedef {{
 *   options: {
 *     validate: {
 *       params: import('joi').Schema,
 *       payload: import('joi').Schema,
 *       failAction: (request: HapiRequest & { params: PeriodParams, payload: DataPagePayload }, h: ResponseToolkit, error: Error | undefined) => Promise<ResponseObject>
 *     }
 *   },
 *   handler: (request: HapiRequest & { params: PeriodParams, payload: DataPagePayload }, h: ResponseToolkit) => Promise<ResponseObject>
 * }} DataPagePostController
 */

/**
 * @import { ResponseObject, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './period-params-schema.js'
 */
