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

export const loadsSchema = Joi.object({
  added: loadValiditySchema.required(),
  unchanged: loadValiditySchema.required(),
  adjusted: loadValiditySchema.required()
})

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

// Mirrors epr-backend: each bucket's rows are truncated to this cap, so a count
// at or above it means the listed rows are incomplete and the view shows a
// "too many to list" message instead.
export const MAX_ROWS_PER_BUCKET = 100

const rowsSchema = Joi.array().items(rowDetailSchema).max(MAX_ROWS_PER_BUCKET)

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
  loadsByReportingPeriod: loadsByReportingPeriodSchema.optional(),
  processingType: Joi.string().optional(),
  material: Joi.string().optional(),
  accreditationNumber: Joi.string().optional()
})
