import {
  dateReceivedSchema,
  wasteTypeSchema,
  prnIssuedSchema,
  weightsSchema,
  recyclabilitySchema,
  supplierSchema,
  carrierSchema,
  validateDate
} from './validation.js'
import {
  EWC_CODES,
  WASTE_DESCRIPTIONS,
  RECYCLABLE_PROPORTION_METHODS,
  MAX_WEIGHT,
  MIN_WEIGHT
} from './reference-data.js'
import { calculateNetWeight } from './calculations.js'

const BASE = '/received-loads'

export const PATHS = Object.freeze({
  base: BASE,
  start: `${BASE}/start`,
  dateReceived: `${BASE}/date-received`,
  wasteType: `${BASE}/waste-type`,
  prn: `${BASE}/prn`,
  weights: `${BASE}/weights`,
  recyclability: `${BASE}/recyclability`,
  supplier: `${BASE}/supplier-details`,
  carrier: `${BASE}/carrier-details`,
  check: `${BASE}/check-your-answers`,
  confirmation: `${BASE}/confirmation`
})

const selectItems = (values, selected, placeholder) => [
  { value: '', text: placeholder },
  ...values.map((value) => ({ value, text: value, selected: value === selected }))
]

const yesNoItems = (selected) => [
  { value: 'Yes', text: 'Yes', checked: selected === 'Yes' },
  { value: 'No', text: 'No', checked: selected === 'No' }
]

const dateParts = (values) => {
  if (
    values['dateReceived-day'] !== undefined ||
    values['dateReceived-month'] !== undefined ||
    values['dateReceived-year'] !== undefined
  ) {
    return {
      day: values['dateReceived-day'] ?? '',
      month: values['dateReceived-month'] ?? '',
      year: values['dateReceived-year'] ?? ''
    }
  }
  const [year = '', month = '', day = ''] = (values.dateReceived ?? '').split('-')
  return { day, month, year }
}

/**
 * The ordered data-entry steps of the journey. Each step is rendered and
 * validated by the same factory; the per-step differences live here.
 *
 * @type {ReadonlyArray<import('./step-factory.js').Step>}
 */
export const STEPS = Object.freeze([
  {
    path: PATHS.dateReceived,
    template: 'received-loads/date-received',
    title: 'Date received for reprocessing',
    schema: dateReceivedSchema,
    back: PATHS.start,
    next: PATHS.wasteType,
    anchors: { dateReceived: 'dateReceived-day' },
    viewModel: (values) => ({ date: dateParts(values) }),
    check: (payload) => {
      const result = validateDate(payload)
      return result.error
        ? [{ field: 'dateReceived', message: result.error }]
        : []
    },
    collect: (payload) => ({ dateReceived: validateDate(payload).value })
  },
  {
    path: PATHS.wasteType,
    template: 'received-loads/waste-type',
    title: 'Waste type',
    schema: wasteTypeSchema,
    back: PATHS.dateReceived,
    next: PATHS.prn,
    viewModel: (values) => ({
      ewcItems: selectItems(EWC_CODES, values.ewcCode, 'Choose an EWC code'),
      descriptionItems: selectItems(
        WASTE_DESCRIPTIONS,
        values.wasteDescription,
        'Choose a waste description'
      )
    }),
    collect: (payload) => ({
      ewcCode: payload.ewcCode,
      wasteDescription: payload.wasteDescription
    })
  },
  {
    path: PATHS.prn,
    template: 'received-loads/prn',
    title: 'PRN or PERN',
    schema: prnIssuedSchema,
    back: PATHS.wasteType,
    next: PATHS.weights,
    viewModel: (values) => ({ prnItems: yesNoItems(values.prnIssued) }),
    collect: (payload) => ({ prnIssued: payload.prnIssued })
  },
  {
    path: PATHS.weights,
    template: 'received-loads/weights',
    title: 'Weights',
    schema: weightsSchema,
    back: PATHS.prn,
    next: PATHS.recyclability,
    collect: (payload) => ({
      grossWeight: payload.grossWeight,
      tareWeight: payload.tareWeight,
      palletWeight: payload.palletWeight
    }),
    check: (payload) => {
      const net = calculateNetWeight(payload)
      if (net < MIN_WEIGHT) {
        return [
          {
            field: 'grossWeight',
            message:
              'The net weight (gross weight minus tare and pallet weights) cannot be less than 0 tonnes. Check your weights.'
          }
        ]
      }
      if (net > MAX_WEIGHT) {
        return [
          {
            field: 'grossWeight',
            message: `The net weight (gross weight minus tare and pallet weights) cannot be more than ${MAX_WEIGHT} tonnes. Check your weights.`
          }
        ]
      }
      return []
    }
  },
  {
    path: PATHS.recyclability,
    template: 'received-loads/recyclability',
    title: 'Recyclable proportion',
    schema: recyclabilitySchema,
    back: PATHS.weights,
    next: PATHS.supplier,
    viewModel: (values) => ({
      bailingItems: yesNoItems(values.bailingWireProtocol),
      methodItems: selectItems(
        RECYCLABLE_PROPORTION_METHODS,
        values.calculationMethod,
        'Choose a calculation method'
      )
    }),
    collect: (payload) => ({
      bailingWireProtocol: payload.bailingWireProtocol,
      calculationMethod: payload.calculationMethod,
      nonTargetWeight: payload.nonTargetWeight,
      recyclablePercentage: payload.recyclablePercentage
    }),
    check: (payload, draft) => {
      const net = calculateNetWeight(draft)
      if (payload.nonTargetWeight > net) {
        return [
          {
            field: 'nonTargetWeight',
            message: `The weight of non-target materials cannot be more than the net weight of ${net} tonnes`
          }
        ]
      }
      return []
    }
  },
  {
    path: PATHS.supplier,
    template: 'received-loads/supplier-details',
    title: 'Supplier details',
    schema: supplierSchema,
    back: PATHS.recyclability,
    next: PATHS.carrier,
    collect: (payload) => ({
      supplierName: payload.supplierName ?? '',
      supplierAddress: payload.supplierAddress ?? '',
      supplierPostcode: payload.supplierPostcode ?? '',
      supplierEmail: payload.supplierEmail ?? '',
      supplierPhone: payload.supplierPhone ?? '',
      activitiesCarriedOut: payload.activitiesCarriedOut ?? ''
    })
  },
  {
    path: PATHS.carrier,
    template: 'received-loads/carrier-details',
    title: 'Carrier and references',
    schema: carrierSchema,
    back: PATHS.supplier,
    next: PATHS.check,
    collect: (payload) => ({
      carrierName: payload.carrierName ?? '',
      cbdRegNumber: payload.cbdRegNumber ?? '',
      vehicleRegistration: payload.vehicleRegistration ?? '',
      weighbridgeTicket: payload.weighbridgeTicket ?? '',
      yourReference: payload.yourReference ?? ''
    })
  }
])
