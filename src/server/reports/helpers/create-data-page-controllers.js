import { periodParamsSchema } from './period-params-schema.js'
import { buildValidationErrors } from './validation.js'

/**
 * Creates GET and POST controllers for a data-entry page.
 *
 * Every data page shares the same GET handler (validate params → build view
 * data → render) and the same POST failAction (build validation errors →
 * re-render with errors). This factory extracts that boilerplate so each
 * page only needs to supply its unique configuration.
 * @param {object} config
 * @param {string} config.viewPath - Nunjucks template path
 * @param {string} config.fieldName - Payload field name (used to extract the submitted value on validation failure)
 * @param {import('joi').Schema} config.payloadSchema - Joi schema for POST payload
 * @param {(request: Request, options?: object) => Promise<object>} config.buildViewData - Builds the full view-model for the template
 * @param {(request: Request, h: ResponseToolkit) => Promise<*>} config.postHandler - POST success handler
 * @returns {{ getController: Partial<ServerRoute>, postController: Partial<ServerRoute> }}
 */
export function createDataPageControllers({
  viewPath,
  fieldName,
  payloadSchema,
  buildViewData,
  postHandler
}) {
  /** @satisfies {Partial<ServerRoute>} */
  const getController = {
    options: {
      validate: {
        params: periodParamsSchema
      }
    },
    async handler(request, h) {
      const viewData = await buildViewData(request)
      return h.view(viewPath, viewData)
    }
  }

  /** @satisfies {Partial<ServerRoute>} */
  const postController = {
    options: {
      validate: {
        params: periodParamsSchema,
        payload: payloadSchema,
        async failAction(request, h, error) {
          const { errors, errorSummary } = buildValidationErrors(request, error)

          const viewData = await buildViewData(request, {
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
 * @import { Request, ResponseToolkit, ServerRoute } from '@hapi/hapi'
 */
