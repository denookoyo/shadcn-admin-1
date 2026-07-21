export function getOrderSource(channel: unknown) {
  const value = String(channel || '').trim()
  const normalized = value.toLowerCase()
  if (normalized === 'marketplace.hedgetech.app') return { label: 'Marketplace personal API', verified: true }
  if (normalized === 'marketplace') return { label: 'Hedgetech Marketplace', verified: true }
  if (normalized === 'dashboard') return { label: 'Gang Ledger dashboard', verified: true }
  if (normalized === 'pos') return { label: 'Connected POS', verified: true }
  return { label: value || 'Unknown source', verified: false }
}
