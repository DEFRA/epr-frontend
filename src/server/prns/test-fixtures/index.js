export const mockCredentials = {
  profile: {
    id: 'user-123',
    email: 'test@example.com'
  },
  idToken: 'mock-id-token'
}

export const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

export const fixtureReprocessor = {
  organisationData: { id: 'org-123', name: 'Reprocessor Organisation' },
  registration: {
    id: 'reg-001',
    wasteProcessingType: 'reprocessor-input',
    material: 'glass',
    site: { address: { line1: 'Reprocessing Site' } },
    accreditationId: 'acc-001'
  },
  accreditation: {
    id: 'acc-001',
    status: 'approved',
    material: 'Plastic',
    accreditationNumber: '090925',
    address: 'South Road, Liverpool, L22 3DH'
  }
}

export const fixtureExporter = {
  organisationData: { id: 'org-456', name: 'Exporter Organisation' },
  registration: {
    id: 'reg-002',
    wasteProcessingType: 'exporter',
    material: 'plastic',
    site: null,
    accreditationId: 'acc-002'
  },
  accreditation: {
    id: 'acc-002',
    status: 'approved',
    material: 'Glass',
    accreditationNumber: '123456',
    address: 'North Street, Manchester, M1 1AA'
  }
}
