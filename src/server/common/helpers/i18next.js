import middleware from 'i18next-http-middleware'

export const i18nPlugin = {
  name: 'app-i18n',
  version: '1.0.0',
  register: async function (server, options) {
    const { i18next } = options

    server.ext('onRequest', (request, h) => {
      middleware.handle(i18next)(request.raw.req, request.raw.res, () => {})
      request.i18n = request.raw.req.i18n
      request.t = request.i18n.t.bind(request.i18n)
      return h.continue
    })

    server.ext('onPreResponse', (request, h) => {
      if (request.response?.source?.context) {
        request.response.source.context.t = request.t
        request.response.source.context.language = request.i18n.language
      }
      return h.continue
    })
  }
}
