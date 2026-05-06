export function getLogFormatType({ isProduction }) {
  return isProduction ? 'ecs' : 'pino-pretty'
}

export function getLogRedactType({ isProduction }) {
  return isProduction
    ? [
        'http.request.headers.authorization',
        'http.request.headers.cookie',
        'http.response.headers'
      ]
    : []
}
