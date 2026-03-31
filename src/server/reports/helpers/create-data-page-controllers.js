import { periodParamsSchema } from './period-params-schema.js'
import { getRedirectUrl } from './redirect.js'
import { updateReport } from './update-report.js'
import { buildValidationErrors } from './validation.js'

/**
 * Builds view data by calling the guard function with a page-fields callback.
 * @param {(request: Request, buildPageFields: (ctx: object) => object, options: object) => Promise<object>} guardFn
 * @param {(ctx: object) => (localise: (key: string, params?: object) => string) => object} pageFields
 * @param {object} guardOptions
 * @param {Request} request
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
 * For simple pages that just save a field and redirect, provide `nextPage`.
 * For pages with custom post logic (e.g. business validation), provide
 * `createPostHandler` which receives `{ buildViewData, viewPath }`.
 * @param {object} config
 * @param {string} config.viewPath - Nunjucks template path
 * @param {string} config.fieldName - Payload field name
 * @param {import('joi').Schema} config.payloadSchema - Joi schema for POST payload
 * @param {(ctx: object) => (localise: (key: string, params?: object) => string) => object} config.pageFields - Returns localised page fields from context
 * @param {(request: Request, buildPageFields: (ctx: object) => object, options: object) => Promise<object>} config.guardFn - Guard function (buildExporterViewData or buildReprocessorViewData)
 * @param {object} [config.guardOptions] - Extra options passed to guardFn (e.g. { accreditedOnly: true })
 * @param {string} [config.nextPage] - Redirect target for simple update-and-redirect handlers
 * @param {(deps: { getViewData: (request: Request, options?: object) => Promise<object>, viewPath: string }) => (request: Request, h: ResponseToolkit) => Promise<ResponseObject>} [config.createPostHandler] - Factory for custom POST handler
 * @returns {{ getController: Partial<ServerRoute>, postController: Partial<ServerRoute> }}
 */
export function createDataPageControllers({
  viewPath,
  fieldName,
  payloadSchema,
  pageFields,
  guardFn,
  guardOptions = {},
  nextPage,
  createPostHandler
}) {
  /** @param {Request} request */
  const getViewData = (request, options = {}) =>
    buildViewData(guardFn, pageFields, guardOptions, request, options)

  /** @satisfies {Partial<ServerRoute>} */
  const getController = {
    options: {
      validate: {
        params: periodParamsSchema
      }
    },
    async handler(request, h) {
      const viewData = await getViewData(request)
      return h.view(viewPath, viewData)
    }
  }

  const postHandler = createPostHandler
    ? createPostHandler({ getViewData, viewPath })
    : createSimplePostHandler(fieldName, nextPage)

  /** @satisfies {Partial<ServerRoute>} */
  const postController = {
    options: {
      validate: {
        params: periodParamsSchema,
        payload: payloadSchema,
        async failAction(request, h, error) {
          const { errors, errorSummary } = buildValidationErrors(request, error)

          const viewData = await getViewData(request, {
            value: request.payload[fieldName],
            errors,
            errorSummary
          })

          return h.view(viewPath, viewData).takeover()
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
 * @returns {(request: Request, h: ResponseToolkit) => Promise<ResponseObject>}
 */
function createSimplePostHandler(fieldName, nextPage) {
  return async (request, h) => {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const session = request.auth.credentials

    await updateReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      { [fieldName]: request.payload[fieldName] },
      session.idToken
    )

    return h.redirect(
      getRedirectUrl(request, request.params, request.payload.action, nextPage)
    )
  }
}

/**
 * @import { Request, ResponseObject, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 */
