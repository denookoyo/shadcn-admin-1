// api/ping.ts
export const config = { runtime: 'edge' } as const

export default async function handler(request: Request) {
  return new Response(JSON.stringify({ ok: true, url: new URL(request.url).pathname }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  })
}
