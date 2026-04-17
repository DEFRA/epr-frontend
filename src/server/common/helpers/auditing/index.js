import { audit } from '@defra/cdp-auditing'

/**
 * @param {string} userId
 * @param {string | undefined} userEmail
 */
function auditSignIn(userId, userEmail) {
  auditSSO('sign-in', userId, userEmail)
}

/**
 * @param {string} userId
 * @param {string | undefined} userEmail
 */
function auditSignOut(userId, userEmail) {
  auditSSO('sign-out', userId, userEmail)
}

/**
 * @param {'sign-in' | 'sign-out'} action
 * @param {string} userId
 * @param {string | undefined} userEmail
 */
function auditSSO(action, userId, userEmail) {
  const payload = {
    event: {
      category: 'access',
      action
    },
    context: {},
    user: {
      id: userId,
      email: userEmail
    }
  }
  audit(payload)
}

export { auditSignIn, auditSignOut }
