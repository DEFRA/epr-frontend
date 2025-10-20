export function getSessionCacheEngineType(isProduction = false) {
  return isProduction ? 'redis' : 'memory'
}
