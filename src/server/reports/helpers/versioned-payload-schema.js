import Joi from 'joi'

const MAX_DECLARER_NAME_LENGTH = 255
const MIN_DECLARER_NAME_LENGTH = 2
const INVALID_DECLARER_NAME_CHARS_PATTERN = /[@#$%&<>]/

/**
 * Shape produced by `versionedPayloadSchema` after Joi validation.
 * @typedef {{ version: number, crumb?: string }} VersionedPayload
 */

export const versionedPayloadSchema = Joi.object({
  version: Joi.number().integer().min(1).required(),
  crumb: Joi.string()
})

/**
 * Shape produced by `submitPayloadSchema` after Joi validation.
 * @typedef {{ version: number, submissionDeclaredBy: string, crumb?: string }} SubmitPayload
 */

export const submitPayloadSchema = Joi.object({
  version: Joi.number().integer().min(1).required(),
  crumb: Joi.string(),
  submissionDeclaredBy: Joi.string()
    .min(MIN_DECLARER_NAME_LENGTH)
    .max(MAX_DECLARER_NAME_LENGTH)
    .custom((value, helpers) => {
      if (INVALID_DECLARER_NAME_CHARS_PATTERN.test(value)) {
        return helpers.error('string.invalidChars')
      }
      return value
    })
    .required()
    .messages({
      'string.empty': 'reports:submitDeclarationFullNameErrorEmpty',
      'any.required': 'reports:submitDeclarationFullNameErrorEmpty',
      'string.min': 'reports:submitDeclarationFullNameErrorTooShort',
      'string.max': 'reports:submitDeclarationFullNameErrorTooLong',
      'string.invalidChars':
        'reports:submitDeclarationFullNameErrorInvalidChars'
    })
})
