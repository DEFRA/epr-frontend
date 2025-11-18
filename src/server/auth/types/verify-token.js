/**
 * @typedef {object} DecodedToken
 * @property {object} decoded - The decoded token
 * @property {object} decoded.header - JWT header
 * @property {object} decoded.payload - JWT payload with user claims
 * @property {string} decoded.signature - JWT signature
 */

/**
 * @typedef {function(string): DecodedToken} VerifyToken
 * Function that verifies JWT signature and returns decoded token
 * @param {string} token - JWT token string to verify
 * @returns {DecodedToken} Decoded and verified token
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
