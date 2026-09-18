// The backend hands back a presigned URL and this server fetches it, so an
// unexpected host would be a server-side request to wherever upstream said.
const ALLOWED_URL_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.s3\.[a-z0-9-]+\.amazonaws\.com\//,
  /^https:\/\/s3\.[a-z0-9-]+\.amazonaws\.com\//,
  /^https:\/\/[a-z0-9-]+\.s3\.amazonaws\.com\//,
  /^http:\/\/localhost:4566\//,
  /^http:\/\/floci:4566\//
]

/**
 * @param {string} url
 * @returns {boolean}
 */
export const isAllowedDownloadUrl = (url) =>
  ALLOWED_URL_PATTERNS.some((pattern) => pattern.test(url))

/**
 * The name the backend signed the URL to be served under. Read from the URL
 * rather than from the response because storage need not honour the override -
 * the emulator the journey tests run against does not - and the name should
 * not depend on which storage answered.
 * @param {string} url
 * @returns {string | null}
 */
export const signedDisposition = (url) =>
  new URL(url).searchParams.get('response-content-disposition')
