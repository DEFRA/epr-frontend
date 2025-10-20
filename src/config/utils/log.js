export function getLogFormatType(isProduction = false) {
  return isProduction ? 'ecs' : 'pino-pretty'
}

export function getLogRedactType(isProduction = false) {
  return isProduction
    ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
    : []
}
