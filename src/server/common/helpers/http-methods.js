const READ_METHODS = Object.freeze(['get', 'head'])

/**
 * Whether a request only reads. Any other method, known or not, is a write.
 * @param {string} method - lower case, as hapi gives it
 * @returns {boolean}
 */
export const isReadMethod = (method) => READ_METHODS.includes(method)
