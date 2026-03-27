import Joi from 'joi'

import { WASTE_RECORD_TYPE } from '#domain/waste-records/model.js'
import { summaryLogStatuses } from '#server/common/constants/statuses.js'

export const loadCategorySchema = Joi.object({
  count: Joi.number().integer().min(0).required(),
  rowIds: Joi.array()
    .items(Joi.alternatives().try(Joi.string(), Joi.number()))
    .required()
})

export const loadValiditySchema = Joi.object({
  valid: loadCategorySchema.required(),
  invalid: loadCategorySchema.required(),
  included: loadCategorySchema.required(),
  excluded: loadCategorySchema.required()
})

export const loadValidOnlySchema = Joi.object({
  valid: loadCategorySchema.required()
})

export const loadsSchema = Joi.object({
  added: loadValiditySchema.required(),
  unchanged: loadValiditySchema.required(),
  adjusted: loadValiditySchema.required()
})

export const loadsByWasteRecordTypeSchema = Joi.array()
  .items(
    Joi.object({
      wasteRecordType: Joi.string()
        .valid(...Object.values(WASTE_RECORD_TYPE))
        .required(),
      sheetName: Joi.string().required(),
      added: loadValidOnlySchema.required(),
      unchanged: loadValidOnlySchema.required(),
      adjusted: loadValidOnlySchema.required()
    })
  )
  .unique('wasteRecordType')

export const summaryLogStatusResponseSchema = Joi.object({
  status: Joi.string()
    .valid(
      summaryLogStatuses.preprocessing,
      summaryLogStatuses.rejected,
      summaryLogStatuses.validating,
      summaryLogStatuses.invalid,
      summaryLogStatuses.validated,
      summaryLogStatuses.submitting,
      summaryLogStatuses.submitted,
      summaryLogStatuses.superseded,
      summaryLogStatuses.validationFailed,
      summaryLogStatuses.submissionFailed
    )
    .required(),
  validation: Joi.object({
    failures: Joi.array().required(),
    concerns: Joi.object().optional(),
    totalIssuesCount: Joi.number().integer().optional()
  }).optional(),
  loads: loadsSchema.optional(),
  loadsByWasteRecordType: loadsByWasteRecordTypeSchema.optional(),
  processingType: Joi.string().optional(),
  material: Joi.string().optional(),
  accreditationNumber: Joi.string().optional()
})
