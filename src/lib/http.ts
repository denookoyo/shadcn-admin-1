import { toast } from 'sonner'

export async function fetchJson<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const data = await res.json()
      message = data?.error || data?.message || message
    } catch {
      try {
        const text = await res.text()
        if (text) message = text
      } catch {}
    }
    try { toast.error(message) } catch {}
    throw new Error(message)
  }
  if (res.status === 204) return undefined as unknown as T
  try {
    return (await res.json()) as T
  } catch {
    return undefined as unknown as T
  }
}

