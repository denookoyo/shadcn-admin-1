export type MarketplaceSaleSignal = {
  compareAtPrice: number
  currentPrice: number
  savingsAmount: number
  savingsPercent: number
  badge: string
  kicker: string
  urgency: string
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

export function formatAudPrice(value: number) {
  return `A$${roundMoney(value).toFixed(2)}`
}

export function getMarketplaceSaleSignal(input: {
  price?: number | null
  compareAtPrice?: number | null
}): MarketplaceSaleSignal | null {
  const currentPrice = Number(input.price ?? 0)
  const compareAtPrice = Number(input.compareAtPrice ?? 0)

  if (!Number.isFinite(currentPrice) || !Number.isFinite(compareAtPrice)) return null
  if (currentPrice <= 0 || compareAtPrice <= currentPrice) return null

  const savingsAmount = roundMoney(compareAtPrice - currentPrice)
  const savingsPercent = Math.max(1, Math.round((savingsAmount / compareAtPrice) * 100))

  if (savingsPercent >= 50) {
    return {
      compareAtPrice,
      currentPrice,
      savingsAmount,
      savingsPercent,
      badge: `${savingsPercent}% OFF`,
      kicker: 'Half-price headline',
      urgency: `Save ${formatAudPrice(savingsAmount)} before the offer disappears.`,
    }
  }

  if (savingsPercent >= 30) {
    return {
      compareAtPrice,
      currentPrice,
      savingsAmount,
      savingsPercent,
      badge: `${savingsPercent}% OFF`,
      kicker: 'Major markdown',
      urgency: `Now ${formatAudPrice(currentPrice)} instead of ${formatAudPrice(compareAtPrice)}.`,
    }
  }

  if (savingsPercent >= 20) {
    return {
      compareAtPrice,
      currentPrice,
      savingsAmount,
      savingsPercent,
      badge: `${savingsPercent}% OFF`,
      kicker: 'Seasonal deal',
      urgency: `Pocket ${formatAudPrice(savingsAmount)} on this one right now.`,
    }
  }

  return {
    compareAtPrice,
    currentPrice,
    savingsAmount,
    savingsPercent,
    badge: `${savingsPercent}% OFF`,
    kicker: 'Price drop',
    urgency: `Save ${formatAudPrice(savingsAmount)} while the markdown lasts.`,
  }
}
