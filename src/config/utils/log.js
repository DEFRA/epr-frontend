export function getLogFormatType({ isProduction }) {
  return isProduction ? 'ecs' : 'pino-pretty'
}
