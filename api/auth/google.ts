// api/auth/google.ts
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).send('Method Not Allowed')
    }
  
    // Example: handle Google Sign-In JWT or auth code from your client
    // const { credential } = req.body
    // verify credential, set cookies, etc.
  
    return res.status(200).json({ ok: true })
  }
  