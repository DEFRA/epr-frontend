/**
 * @import { DefraIdJwtPayload } from './auth.js'
 */

/**
 * @typedef {(token: string) => Promise<DefraIdJwtPayload>} VerifyToken
 * Function that verifies JWT signature and returns payload
 * @param {string} token - JWT token string to verify
 * @returns {Promise<DefraIdJwtPayload>} JWT payload with Defra ID user claims
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
