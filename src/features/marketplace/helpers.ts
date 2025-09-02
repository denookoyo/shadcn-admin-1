export function imageFor(query: string, w = 800, h = 600) {
  const provider = (import.meta as any).env?.VITE_IMAGE_PROVIDER || 'unsplash'
  if (provider === 'picsum') {
    return `https://picsum.photos/seed/${encodeURIComponent(query)}/${w}/${h}`
  }
  if (provider === 'placeholder') {
    return `https://placehold.co/${w}x${h}?text=${encodeURIComponent(query)}`
  }
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}`
}

export function stars(rating: number) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty)
}

