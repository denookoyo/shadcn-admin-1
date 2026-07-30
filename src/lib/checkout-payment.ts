type CheckoutPaymentOrderLike = {
  paymentUrl?: unknown
}

export type CheckoutPaymentResponseLike = CheckoutPaymentOrderLike & {
  checkoutUrl?: unknown
  orders?: CheckoutPaymentOrderLike[] | null
}

function normalizeCheckoutUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function resolveImmediateCheckoutUrl(response: CheckoutPaymentResponseLike | null | undefined) {
  if (!response) return null

  const candidates = [
    response.checkoutUrl,
    response.paymentUrl,
    ...(Array.isArray(response.orders) ? response.orders.map((order) => order?.paymentUrl) : []),
  ]

  for (const candidate of candidates) {
    const url = normalizeCheckoutUrl(candidate)
    if (url) return url
  }

  return null
}
