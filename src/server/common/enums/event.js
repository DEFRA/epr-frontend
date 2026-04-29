/**
 * Category codes used in `event.category` for indexed logging. Wire values are
 * lowercase snake_case for consistency with backend and CDP indexing.
 */
export const loggingEventCategories = {
  http: 'http'
}

/**
 * Action codes used in `event.action` for indexed logging. Wire values are
 * lowercase snake_case for consistency with backend and CDP indexing.
 */
export const loggingEventActions = {
  checkAccreditation: 'check_accreditation',
  extractRegistrationTypes: 'extract_registration_types',
  requestFailure: 'request_failure',
  responseFailure: 'response_failure'
}
