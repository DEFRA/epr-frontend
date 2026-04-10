import { describe, it, expect } from 'vitest'

import {
  getTotalTonnageSentOn,
  buildSupplierRows,
  buildSupplierDetailRows,
  buildDestinationRows,
  buildDestinationDetailRows,
  buildOverseasSiteRows,
  buildOverseasSiteDetailRows,
  buildUnapprovedOverseasSiteDetailRows,
  buildUnapprovedOverseasSiteRows
} from './build-table-rows.js'

describe(getTotalTonnageSentOn, () => {
  it('sums all three tonnage fields', () => {
    const wasteSent = {
      tonnageSentToReprocessor: 10.5,
      tonnageSentToExporter: 20.25,
      tonnageSentToAnotherSite: 5.0
    }

    expect(getTotalTonnageSentOn(wasteSent)).toBe(35.75)
  })
})

describe(buildSupplierRows, () => {
  it('builds rows with name, facility type, and formatted tonnage', () => {
    const suppliers = [
      {
        supplierName: 'Acme Waste',
        facilityType: 'Baler',
        tonnageReceived: 1234.5
      }
    ]

    const rows = buildSupplierRows(suppliers)

    expect(rows).toStrictEqual([
      [{ text: 'Acme Waste' }, { text: 'Baler' }, { text: '1,234.50' }]
    ])
  })
})

describe(buildSupplierDetailRows, () => {
  it('builds rows with name, facility type, address, phone, and email', () => {
    const suppliers = [
      {
        supplierName: 'Acme Waste',
        facilityType: 'Baler',
        supplierAddress: '1 High St',
        supplierPhone: '01onal',
        supplierEmail: 'a@b.com'
      }
    ]

    const rows = buildSupplierDetailRows(suppliers)

    expect(rows).toStrictEqual([
      [
        { text: 'Acme Waste' },
        { text: 'Baler' },
        { text: '1 High St' },
        { text: '01onal' },
        { text: 'a@b.com' }
      ]
    ])
  })
})

describe(buildDestinationRows, () => {
  it('builds rows with recipient, facility type, and formatted tonnage', () => {
    const destinations = [
      {
        recipientName: 'Green Recyclers',
        facilityType: 'Reprocessor',
        tonnageSentOn: 500.1
      }
    ]

    const rows = buildDestinationRows(destinations)

    expect(rows).toStrictEqual([
      [{ text: 'Green Recyclers' }, { text: 'Reprocessor' }, { text: '500.10' }]
    ])
  })
})

describe(buildDestinationDetailRows, () => {
  it('builds rows with recipient, facility type, address, and formatted tonnage', () => {
    const destinations = [
      {
        recipientName: 'Green Recyclers',
        facilityType: 'Reprocessor',
        address: '2 Low St',
        tonnageSentOn: 750.0
      }
    ]

    const rows = buildDestinationDetailRows(destinations)

    expect(rows).toStrictEqual([
      [
        { text: 'Green Recyclers' },
        { text: 'Reprocessor' },
        { text: '2 Low St' },
        { text: '750.00' }
      ]
    ])
  })
})

describe(buildOverseasSiteRows, () => {
  const overseasSites = [
    {
      siteName: 'Hamburg Plant',
      orsId: 'ORS-001',
      country: 'Germany',
      approved: true
    },
    {
      siteName: 'Paris Facility',
      orsId: 'ORS-002',
      country: 'France',
      approved: false
    }
  ]

  it('builds rows with site name, ORS ID, and country', () => {
    const rows = buildOverseasSiteRows(overseasSites)

    expect(rows).toStrictEqual([
      [{ text: 'Hamburg Plant' }, { text: 'ORS-001' }, { text: 'Germany' }],
      [{ text: 'Paris Facility' }, { text: 'ORS-002' }, { text: 'France' }]
    ])
  })

  it('appends Yes/No for approval when showApprovalColumn is true', () => {
    const rows = buildOverseasSiteRows(overseasSites, {
      showApprovalColumn: true
    })

    expect(rows).toStrictEqual([
      [
        { text: 'Hamburg Plant' },
        { text: 'ORS-001' },
        { text: 'Germany' },
        { text: 'Yes' }
      ],
      [
        { text: 'Paris Facility' },
        { text: 'ORS-002' },
        { text: 'France' },
        { text: 'No' }
      ]
    ])
  })

  it('omits approval column when showApprovalColumn is false', () => {
    const rows = buildOverseasSiteRows(overseasSites, {
      showApprovalColumn: false
    })

    expect(rows).toStrictEqual([
      [{ text: 'Hamburg Plant' }, { text: 'ORS-001' }, { text: 'Germany' }],
      [{ text: 'Paris Facility' }, { text: 'ORS-002' }, { text: 'France' }]
    ])
  })
})

describe(buildOverseasSiteDetailRows, () => {
  const overseasSites = [
    {
      siteName: 'Hamburg Plant',
      tonnageExported: 100.5,
      orsId: 'ORS-001',
      country: 'Germany',
      approved: true
    },
    {
      siteName: 'Paris Facility',
      tonnageExported: 200.0,
      orsId: 'ORS-002',
      country: 'France',
      approved: false
    }
  ]

  it('builds rows without approval column by default', () => {
    const rows = buildOverseasSiteDetailRows(overseasSites)

    expect(rows).toStrictEqual([
      [
        { text: 'Hamburg Plant' },
        { text: '100.50' },
        { text: 'ORS-001' },
        { text: 'Germany' }
      ],
      [
        { text: 'Paris Facility' },
        { text: '200.00' },
        { text: 'ORS-002' },
        { text: 'France' }
      ]
    ])
  })

  it('appends Yes/No for approval when showApprovalColumn is true', () => {
    const rows = buildOverseasSiteDetailRows(overseasSites, {
      showApprovalColumn: true
    })

    expect(rows).toStrictEqual([
      [
        { text: 'Hamburg Plant' },
        { text: '100.50' },
        { text: 'ORS-001' },
        { text: 'Germany' },
        { text: 'Yes' }
      ],
      [
        { text: 'Paris Facility' },
        { text: '200.00' },
        { text: 'ORS-002' },
        { text: 'France' },
        { text: 'No' }
      ]
    ])
  })

  it('omits approval column when showApprovalColumn is false', () => {
    const rows = buildOverseasSiteDetailRows(overseasSites, {
      showApprovalColumn: false
    })

    expect(rows).toStrictEqual([
      [
        { text: 'Hamburg Plant' },
        { text: '100.50' },
        { text: 'ORS-001' },
        { text: 'Germany' }
      ],
      [
        { text: 'Paris Facility' },
        { text: '200.00' },
        { text: 'ORS-002' },
        { text: 'France' }
      ]
    ])
  })
})

describe(buildUnapprovedOverseasSiteDetailRows, () => {
  it('builds rows with formatted tonnage and ORS ID', () => {
    const sites = [{ orsId: 'ORS-999', tonnageExported: 50.0 }]

    const rows = buildUnapprovedOverseasSiteDetailRows(sites)

    expect(rows).toStrictEqual([[{ text: '50.00' }, { text: 'ORS-999' }]])
  })
})

describe(buildUnapprovedOverseasSiteRows, () => {
  it('builds rows with only ORS ID', () => {
    const sites = [{ orsId: 'ORS-999', tonnageExported: 50.0 }]

    const rows = buildUnapprovedOverseasSiteRows(sites)

    expect(rows).toStrictEqual([[{ text: 'ORS-999' }]])
  })
})
