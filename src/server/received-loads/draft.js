const DRAFT_KEY = 'receivedLoadDraft'

/**
 * Returns the in-progress received-load draft from the session, or an empty
 * object if the journey has not been started yet. The draft holds the answers
 * collected so far across the journey's steps.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {Record<string, any>}
 */
export const getDraft = (request) => request.yar.get(DRAFT_KEY) ?? {}

/**
 * Persists the draft back to the session.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {Record<string, any>} draft
 */
export const saveDraft = (request, draft) => {
  request.yar.set(DRAFT_KEY, draft)
}

/**
 * Clears the draft, ending the journey.
 *
 * @param {import('@hapi/hapi').Request} request
 */
export const clearDraft = (request) => {
  request.yar.clear(DRAFT_KEY)
}
