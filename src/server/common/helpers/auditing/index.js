import { audit } from '@defra/cdp-auditing'

function auditSignIn(userId, userEmail) {
  auditSSO('sign-in', userId, userEmail)
}

function auditSignOut(userId, userEmail) {
  auditSSO('sign-out', userId, userEmail)
}

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
