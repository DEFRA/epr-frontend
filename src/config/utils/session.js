export function getSessionCacheEngineType({ isProduction }) {
  return isProduction ? 'redis' : 'memory'
}
