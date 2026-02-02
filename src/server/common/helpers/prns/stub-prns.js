// this will be removed when the real api is available
const stubPrns = [
  {
    prnNumber: 'ER2625468U',
    status: 'awaiting_authorisation',
    issuedToOrganisation: { name: 'Acme Packaging Solutions Ltd' },
    issuedByOrganisation: { name: 'John Smith Ltd' },
    issuedDate: '',
    issuerNotes: 'Quarterly waste collection from Birmingham facility',
    tonnageValue: 150,
    isDecemberWaste: 'No',
    authorisedBy: '',
    position: '',
    createdAt: '2026-01-01'
  },
  {
    prnNumber: 'ER992415095748M',
    status: 'awaiting_acceptance',
    issuedToOrganisation: { name: 'Nestle (SEPA)' },
    issuedByOrganisation: { name: 'John Smith Ltd' },
    issuedDate: '2026-01-15',
    issuerNotes: 'Monthly collection January',
    tonnageValue: 200,
    isDecemberWaste: 'No',
    authorisedBy: 'Jane Doe',
    position: 'Operations Manager',
    createdAt: '2026-01-01'
  },
  {
    prnNumber: 'ER1122334455A',
    status: 'accepted',
    issuedToOrganisation: { name: 'GreenPack Ltd' },
    issuedByOrganisation: { name: 'John Smith Ltd' },
    issuedDate: '2026-01-10',
    issuerNotes: 'Accepted batch from Leeds site',
    tonnageValue: 75,
    isDecemberWaste: 'No',
    authorisedBy: 'Bob Wilson',
    position: 'Site Manager',
    createdAt: '2026-01-01'
  },
  {
    prnNumber: 'ER5566778899B',
    status: 'rejected',
    issuedToOrganisation: { name: 'WasteAway Corp' },
    issuedByOrganisation: { name: 'John Smith Ltd' },
    issuedDate: '2026-01-08',
    issuerNotes: 'Rejected due to tonnage mismatch',
    tonnageValue: 50,
    isDecemberWaste: 'No',
    authorisedBy: 'Alice Brown',
    position: 'Compliance Officer',
    createdAt: '2026-01-01'
  },
  {
    prnNumber: 'EX9988776655C',
    status: 'cancelled',
    issuedToOrganisation: { name: 'EuroPack GmbH' },
    issuedByOrganisation: { name: 'John Smith Ltd' },
    issuedDate: '2025-12-20',
    issuerNotes: 'Cancelled by issuer',
    tonnageValue: 300,
    isDecemberWaste: 'Yes',
    authorisedBy: 'Charlie Davis',
    position: 'Director',
    createdAt: '2026-01-01'
  },
  {
    prnNumber: 'ER4433221100D',
    status: 'awaiting_cancellation',
    issuedToOrganisation: { name: 'RecycleCo Ltd' },
    issuedByOrganisation: { name: 'John Smith Ltd' },
    issuedDate: '2026-01-12',
    issuerNotes: 'Cancellation requested',
    tonnageValue: 120,
    isDecemberWaste: 'No',
    authorisedBy: 'Eve Foster',
    position: 'Waste Manager',
    createdAt: '2026-01-01'
  }
]

export { stubPrns }
