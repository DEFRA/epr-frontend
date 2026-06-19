import Joi from 'joi'

import { WASTE_RECORD_TYPE } from '#domain/waste-records/model.js'
import { summaryLogStatuses } from '#server/common/constants/statuses.js'

const nonNegativeInteger = Joi.number().integer().min(0).required()

export const rowIdSchema = Joi.string().pattern(/^\d+$/, 'numeric')

export const loadCategorySchema = Joi.object({
  count: nonNegativeInteger,
  rowIds: Joi.array().items(rowIdSchema).required()
})

const validationFailureSchema = Joi.object({
  location: Joi.object({
    rowId: rowIdSchema
  }).unknown(true)
}).unknown(true)

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

// One listed load within a bucket, mirroring the backend's rowDetailSchema.
// Kept optional on the buckets so validation never strips the row identity the
// check page renders, while tolerating a backend that omits it.
const rowDetailSchema = Joi.object({
  rowId: Joi.string().required(),
  wasteRecordType: Joi.string()
    .valid(...Object.values(WASTE_RECORD_TYPE))
    .required(),
  exclusionReasons: Joi.array().items(Joi.string()).required(),
  tonnageDelta: Joi.number().required()
})

const rowsSchema = Joi.array().items(rowDetailSchema)

const balanceAffectingBucketSchema = Joi.object({
  count: nonNegativeInteger,
  tonnageDelta: Joi.number().required(),
  rows: rowsSchema
})

const nonBalanceAffectingBucketSchema = Joi.object({
  count: nonNegativeInteger,
  rows: rowsSchema
})

const periodStatusGroupSchema = Joi.object({
  balanceAffecting: balanceAffectingBucketSchema.required(),
  nonBalanceAffecting: nonBalanceAffectingBucketSchema.required()
})

const periodStatusByChangeSchema = Joi.object({
  added: periodStatusGroupSchema.required(),
  adjusted: periodStatusGroupSchema.required()
})

export const loadsByReportingPeriodSchema = Joi.object({
  openPeriodLoads: periodStatusByChangeSchema.required(),
  closedPeriodLoads: periodStatusByChangeSchema.required()
})

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
    failures: Joi.array().items(validationFailureSchema).required(),
    concerns: Joi.object().optional(),
    counts: Joi.object({
      fatal: nonNegativeInteger,
      error: nonNegativeInteger,
      warning: nonNegativeInteger,
      total: nonNegativeInteger
    }).required()
  }).optional(),
  loads: loadsSchema.optional(),
  loadsByWasteRecordType: loadsByWasteRecordTypeSchema.optional(),
  loadsByReportingPeriod: loadsByReportingPeriodSchema.optional(),
  processingType: Joi.string().optional(),
  material: Joi.string().optional(),
  accreditationNumber: Joi.string().optional()
})
