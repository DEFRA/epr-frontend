import { audit } from '@defra/cdp-auditing'

function auditSignOut(userId, userEmail) {
  auditSSO('sign-out', userId, userEmail)
}

function auditSSO(action, userId, userEmail) {
  const payload = {
    event: {
      category: 'access',
      subCategory: 'sso',
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

export { auditSignOut }
