import { describe, expect, it } from 'vitest'

import { buildRemoteOrdersPath } from '../api/_order-path'

describe('marketplace order proxy paths', () => {
  it('reads nested actions from the Vercel query object', () => {
    expect(buildRemoteOrdersPath({ url: '/api/orders', query: { path: 'GL-MRT-123/confirm-appointment' } }))
      .toBe('/api/integrations/marketplace/orders/GL-MRT-123/confirm-appointment')
  })

  it('supports array-shaped Vercel catch-all parameters', () => {
    expect(buildRemoteOrdersPath({ url: '/api/orders', query: { path: ['GL-MRT-123', 'appointment', 'reject-propose'] } }))
      .toBe('/api/integrations/marketplace/orders/GL-MRT-123/appointment/reject-propose')
  })

  it('falls back to URL query and pathname forms', () => {
    expect(buildRemoteOrdersPath({ url: '/api/orders?path=GL-MRT-123%2Fconfirm-appointment' }))
      .toBe('/api/integrations/marketplace/orders/GL-MRT-123/confirm-appointment')
    expect(buildRemoteOrdersPath({ url: '/api/orders/GL-MRT-123/confirm-appointment' }))
      .toBe('/api/integrations/marketplace/orders/GL-MRT-123/confirm-appointment')
  })
})
