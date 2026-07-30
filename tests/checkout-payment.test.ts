import { describe, expect, it } from 'vitest'

import { resolveImmediateCheckoutUrl } from '../src/lib/checkout-payment'

describe('checkout payment handoff', () => {
  it('uses the checkout URL returned by Gang Ledger', () => {
    expect(
      resolveImmediateCheckoutUrl({
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123',
        paymentUrl: 'https://example.com/older-link',
      })
    ).toBe('https://checkout.stripe.com/c/pay/cs_test_123')
  })

  it('falls back to the order payment URL', () => {
    expect(
      resolveImmediateCheckoutUrl({
        checkoutUrl: null,
        orders: [{ paymentUrl: 'https://checkout.stripe.com/c/pay/cs_test_456' }],
      })
    ).toBe('https://checkout.stripe.com/c/pay/cs_test_456')
  })

  it('does not redirect to unsafe or invalid URLs', () => {
    expect(resolveImmediateCheckoutUrl({ checkoutUrl: 'javascript:alert(1)' })).toBeNull()
    expect(resolveImmediateCheckoutUrl({ checkoutUrl: 'not a URL' })).toBeNull()
  })
})
