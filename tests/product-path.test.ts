import { describe, expect, it } from 'vitest'

import { buildRemoteProductsPath } from '../api/_product-path'

describe('marketplace product proxy paths', () => {
  it('forwards the live seller scope to Gang Ledger', () => {
    expect(buildRemoteProductsPath({ url: '/api/products?scope=seller' }))
      .toBe('/api/integrations/marketplace/products?scope=seller')
  })

  it('forwards POS scope for barcode lookups', () => {
    expect(buildRemoteProductsPath({ url: '/api/products/barcode/ABC-123?scope=pos' }))
      .toBe('/api/integrations/marketplace/products/barcode/ABC-123?scope=pos')
  })

  it('does not leak the Vercel path rewrite parameter upstream', () => {
    expect(buildRemoteProductsPath({ url: '/api/products?path=barcode%2FABC-123&scope=pos' }))
      .toBe('/api/integrations/marketplace/products/barcode/ABC-123?scope=pos')
  })
})
