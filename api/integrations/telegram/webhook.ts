export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'Telegram webhook ready' })
  }
  if (req.method === 'POST') {
    try {
      const update = req.body || {}
      console.info('[telegram webhook]', JSON.stringify(update).slice(0, 500))
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('Telegram webhook handler error', err)
      return res.status(500).json({ ok: false })
    }
  }
  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
