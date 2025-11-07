import { describe, expect, test } from 'vitest'
import { getTrustStoreCerts } from '#shared/security/secure-context/get-trust-store-certs.js'

describe('#getTrustStoreCerts', () => {
  const mockProcessEnvWithCerts = {
    TRUSTSTORE_CA_ONE:
      'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCm1vY2stY2VydC1kb3JpcwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
    UNRELATED_ENV: 'not-a-cert'
  }

  test('should provide expected result with "certs"', () => {
    expect(getTrustStoreCerts(mockProcessEnvWithCerts)).toStrictEqual([
      '-----BEGIN CERTIFICATE-----\nmock-cert-doris\n-----END CERTIFICATE-----'
    ])
  })

  test('should provide expected empty array', () => {
    expect(getTrustStoreCerts({})).toStrictEqual([])
  })
})
