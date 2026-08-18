import { createHash } from 'node:crypto'

/**
 * Hashes a user ID to avoid logging PII while preserving uniqueness for metrics
 * @param {string} userId
 * @returns {string}
 */
export const hashUserId = (userId) =>
  createHash('sha256').update(userId).digest('hex')
