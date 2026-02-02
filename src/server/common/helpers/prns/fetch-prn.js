//import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

// this will be updated when the real api is available
const stubPrns = [
  {
    prnNumber: 'ER2625468U',
    status: 'awaiting_authorisation',
    issuedToOrganisation: 'Acme Packaging Solutions Ltd',
    issuedByOrganisation: 'John Smith Ltd',
    issuedDate: '',
    issuerNotes: 'Quarterly waste collection from Birmingham facility',
    tonnageValue: 150,
    isDecemberWaste: 'No',
    authorisedBy: '',
    position: ''
  },
  {
    prnNumber: 'ER992415095748M',
    status: 'awaiting_acceptance',
    issuedToOrganisation: 'Nestle (SEPA)',
    issuedByOrganisation: 'John Smith Ltd',
    issuedDate: '2026-01-15',
    issuerNotes: 'Monthly collection January',
    tonnageValue: 200,
    isDecemberWaste: 'No',
    authorisedBy: 'Jane Doe',
    position: 'Operations Manager'
  },
  {
    prnNumber: 'ER1122334455A',
    status: 'accepted',
    issuedToOrganisation: 'GreenPack Ltd',
    issuedByOrganisation: 'John Smith Ltd',
    issuedDate: '2026-01-10',
    issuerNotes: 'Accepted batch from Leeds site',
    tonnageValue: 75,
    isDecemberWaste: 'No',
    authorisedBy: 'Bob Wilson',
    position: 'Site Manager'
  },
  {
    prnNumber: 'ER5566778899B',
    status: 'rejected',
    issuedToOrganisation: 'WasteAway Corp',
    issuedByOrganisation: 'John Smith Ltd',
    issuedDate: '2026-01-08',
    issuerNotes: 'Rejected due to tonnage mismatch',
    tonnageValue: 50,
    isDecemberWaste: 'No',
    authorisedBy: 'Alice Brown',
    position: 'Compliance Officer'
  },
  {
    prnNumber: 'EX9988776655C',
    status: 'cancelled',
    issuedToOrganisation: 'EuroPack GmbH',
    issuedByOrganisation: 'John Smith Ltd',
    issuedDate: '2025-12-20',
    issuerNotes: 'Cancelled by issuer',
    tonnageValue: 300,
    isDecemberWaste: 'Yes',
    authorisedBy: 'Charlie Davis',
    position: 'Director'
  },
  {
    prnNumber: 'ER4433221100D',
    status: 'awaiting_cancellation',
    issuedToOrganisation: 'RecycleCo Ltd',
    issuedByOrganisation: 'John Smith Ltd',
    issuedDate: '2026-01-12',
    issuerNotes: 'Cancellation requested',
    tonnageValue: 120,
    isDecemberWaste: 'No',
    authorisedBy: 'Eve Foster',
    position: 'Waste Manager'
  }
]

/**
 * Fetches a PRN from EPR Backend for an accreditation
 * @param {string} organisationId - The organisation ID
 * @param {string} accreditationId - The accreditation ID
 * @param {string} prnNumber - The prnNumber
 * @returns {Promise<object|null>}
 */
async function fetchPrn(
  organisationId,
  accreditationId,
  prnNumber
  //, idToken
) {
  // const path = `/v1/organisations/${organisationId}/accreditations/${accreditationId}/prns/${prnNumber}`
  //   return fetchJsonFromBackend(path, {
  //     method: 'GET',
  //     headers: {
  //       Authorization: `Bearer ${idToken}`
  //     }
  //   })

  return stubPrns.find((prn) => prn.prnNumber === prnNumber) ?? null
}

export { fetchPrn }
