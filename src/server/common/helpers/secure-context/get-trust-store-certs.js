/**
 * Get base64 certs from all environment variables starting with TRUSTSTORE_
 * @param {NodeJS.ProcessEnv} envs
 * @returns {string[]}
 */
export function getTrustStoreCerts(envs) {
  return Object.entries(envs)
    .flatMap(([key, value]) =>
      key.startsWith('TRUSTSTORE_') && value ? [value] : []
    )
    .map((envValue) => Buffer.from(envValue, 'base64').toString().trim())
}
