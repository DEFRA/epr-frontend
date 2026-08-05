import { audit } from '@defra/cdp-auditing'

/**
 * @param {string} oidcProvider
 * @param {string} userId
 * @param {string | undefined} userEmail
 */
function auditSignIn(oidcProvider, userId, userEmail) {
  auditSSO('sign-in', oidcProvider, userId, userEmail)
}

/**
 * @param {string} oidcProvider
 * @param {string} userId
 * @param {string | undefined} userEmail
 */
function auditSignOut(oidcProvider, userId, userEmail) {
  auditSSO('sign-out', oidcProvider, userId, userEmail)
}

/**
 * @param {'sign-in' | 'sign-out'} action
 * @param {string} oidcProvider
 * @param {string} userId
 * @param {string | undefined} userEmail
 */
function auditSSO(action, oidcProvider, userId, userEmail) {
  const payload = {
    event: {
      category: 'access',
      action
    },
    context: {
      oidcProvider
    },
    user: {
      id: userId,
      email: userEmail
    }
  }
  audit(payload)
}

export { auditSignIn, auditSignOut }
