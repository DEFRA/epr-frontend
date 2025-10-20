export function getLogFormatType({ isProduction }) {
  return isProduction ? 'ecs' : 'pino-pretty'
}

export function getLogRedactType({ isProduction }) {
  return isProduction
    ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
    : []
}
