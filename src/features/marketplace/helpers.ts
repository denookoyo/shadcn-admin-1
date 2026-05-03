function brandedSvg(query: string, w: number, h: number) {
  const safeLabel = (query || 'Hedgetech Marketplace').slice(0, 42)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${safeLabel}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#102534"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${Math.round(w * 0.78)}" cy="${Math.round(h * 0.22)}" r="${Math.round(Math.min(w, h) * 0.12)}" fill="rgba(255,255,255,0.08)"/>
  <circle cx="${Math.round(w * 0.16)}" cy="${Math.round(h * 0.82)}" r="${Math.round(Math.min(w, h) * 0.18)}" fill="rgba(255,255,255,0.06)"/>
  <text x="50%" y="46%" text-anchor="middle" fill="#ecfeff" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(20, Math.round(w / 18))}" font-weight="700">Hedgetech</text>
  <text x="50%" y="58%" text-anchor="middle" fill="#d1fae5" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(12, Math.round(w / 34))}">${safeLabel}</text>
</svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function imageFor(query: string, w = 800, h = 600) {
  const provider = (import.meta as any).env?.VITE_IMAGE_PROVIDER || 'brand'
  if (provider === 'picsum') {
    return `https://picsum.photos/seed/${encodeURIComponent(query)}/${w}/${h}`
  }
  if (provider === 'placeholder') {
    return `https://placehold.co/${w}x${h}?text=${encodeURIComponent(query)}`
  }
  if (provider === 'unsplash') {
    return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}`
  }
  return brandedSvg(query, w, h)
}

export function stars(rating: number) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty)
}
