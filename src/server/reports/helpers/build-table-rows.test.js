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

const noneText = 'None provided'

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

    const rows = buildSupplierDetailRows(suppliers, noneText)

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

  it('falls back to none text for missing address, phone and email', () => {
    const suppliers = [
      {
        supplierName: 'Acme Waste',
        facilityType: 'Baler',
        supplierAddress: null,
        supplierPhone: null,
        supplierEmail: ''
      }
    ]

    const rows = buildSupplierDetailRows(suppliers, noneText)

    expect(rows).toStrictEqual([
      [
        { text: 'Acme Waste' },
        { text: 'Baler' },
        { text: 'None provided' },
        { text: 'None provided' },
        { text: 'None provided' }
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

    const rows = buildDestinationRows(destinations, noneText)

    expect(rows).toStrictEqual([
      [{ text: 'Green Recyclers' }, { text: 'Reprocessor' }, { text: '500.10' }]
    ])
  })

  it('falls back to none text for missing recipient and facility type', () => {
    const destinations = [
      {
        recipientName: null,
        facilityType: null,
        tonnageSentOn: 500.1
      }
    ]

    const rows = buildDestinationRows(destinations, noneText)

    expect(rows).toStrictEqual([
      [{ text: 'None provided' }, { text: 'None provided' }, { text: '500.10' }]
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

    const rows = buildDestinationDetailRows(destinations, noneText)

    expect(rows).toStrictEqual([
      [
        { text: 'Green Recyclers' },
        { text: 'Reprocessor' },
        { text: '2 Low St' },
        { text: '750.00' }
      ]
    ])
  })

  it('falls back to none text for missing recipient, facility type and address', () => {
    const destinations = [
      {
        recipientName: null,
        facilityType: null,
        address: null,
        tonnageSentOn: 750.0
      }
    ]

    const rows = buildDestinationDetailRows(destinations, noneText)

    expect(rows).toStrictEqual([
      [
        { text: 'None provided' },
        { text: 'None provided' },
        { text: 'None provided' },
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
    const rows = buildOverseasSiteRows(overseasSites, {}, noneText)

    expect(rows).toStrictEqual([
      [{ text: 'Hamburg Plant' }, { text: 'ORS-001' }, { text: 'Germany' }],
      [{ text: 'Paris Facility' }, { text: 'ORS-002' }, { text: 'France' }]
    ])
  })

  it('falls back to none text for a missing country', () => {
    const rows = buildOverseasSiteRows(
      [
        {
          siteName: 'Oslo Plant',
          orsId: 'ORS-003',
          country: null,
          approved: false
        }
      ],
      {},
      noneText
    )

    expect(rows).toStrictEqual([
      [{ text: 'Oslo Plant' }, { text: 'ORS-003' }, { text: 'None provided' }]
    ])
  })

  it('appends Yes/No for approval when showApprovalColumn is true', () => {
    const rows = buildOverseasSiteRows(
      overseasSites,
      {
        showApprovalColumn: true
      },
      noneText
    )

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
    const rows = buildOverseasSiteRows(
      overseasSites,
      {
        showApprovalColumn: false
      },
      noneText
    )

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
    const rows = buildOverseasSiteDetailRows(overseasSites, {}, noneText)

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

  it('falls back to none text for a missing country', () => {
    const rows = buildOverseasSiteDetailRows(
      [
        {
          siteName: 'Oslo Plant',
          tonnageExported: 10.0,
          orsId: 'ORS-003',
          country: null,
          approved: false
        }
      ],
      {},
      noneText
    )

    expect(rows).toStrictEqual([
      [
        { text: 'Oslo Plant' },
        { text: '10.00' },
        { text: 'ORS-003' },
        { text: 'None provided' }
      ]
    ])
  })

  it('appends Yes/No for approval when showApprovalColumn is true', () => {
    const rows = buildOverseasSiteDetailRows(
      overseasSites,
      {
        showApprovalColumn: true
      },
      noneText
    )

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
    const rows = buildOverseasSiteDetailRows(
      overseasSites,
      {
        showApprovalColumn: false
      },
      noneText
    )

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
