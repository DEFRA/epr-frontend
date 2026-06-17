/**
 * Canned suppliers a reprocessor receives loads from repeatedly.
 *
 * In the full service these would come from the organisation's saved
 * suppliers. For the prototype they let a user pick a familiar supplier to
 * prefill the supplier details rather than retyping them for every load.
 */
export const KNOWN_SUPPLIERS = Object.freeze([
  {
    id: 'severnside',
    supplierName: 'Severnside Recycling Ltd',
    supplierAddress: 'Unit 4, Avonmouth Industrial Estate, Bristol',
    supplierPostcode: 'BS11 9YA',
    supplierEmail: 'loads@severnside-recycling.co.uk',
    supplierPhone: '0117 496 1200',
    activitiesCarriedOut: 'Collection and baling of mixed paper and board'
  },
  {
    id: 'pennine',
    supplierName: 'Pennine Paper and Board',
    supplierAddress: '12 Calder Mills, Dewsbury Road, Halifax',
    supplierPostcode: 'HX3 5AX',
    supplierEmail: 'dispatch@penninepaper.co.uk',
    supplierPhone: '01422 360 880',
    activitiesCarriedOut: 'Sorting and grading of recovered fibre'
  },
  {
    id: 'clyde',
    supplierName: 'Clyde Metal Recovery',
    supplierAddress: '7 Riverside Works, Govan Road, Glasgow',
    supplierPostcode: 'G51 2RL',
    supplierEmail: 'weighbridge@clydemetal.co.uk',
    supplierPhone: '0141 445 7733',
    activitiesCarriedOut: 'Collection and shearing of ferrous and non-ferrous metals'
  },
  {
    id: 'anglia',
    supplierName: 'Anglia Glass Reclamation',
    supplierAddress: 'Whitlingham Lane, Trowse, Norwich',
    supplierPostcode: 'NR14 8TZ',
    supplierEmail: 'cullet@angliaglass.co.uk',
    supplierPhone: '01603 712 540',
    activitiesCarriedOut: 'Collection and colour-sorting of container glass'
  },
  {
    id: 'mersey',
    supplierName: 'Mersey Plastics Reprocessing',
    supplierAddress: 'Dock Road South, Bromborough, Wirral',
    supplierPostcode: 'CH62 4SQ',
    supplierEmail: 'intake@merseyplastics.co.uk',
    supplierPhone: '0151 643 9090',
    activitiesCarriedOut: 'Collection, washing and flaking of rigid plastics'
  }
])
