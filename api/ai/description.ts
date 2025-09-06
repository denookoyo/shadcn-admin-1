import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return res.status(400).json({ error: 'Missing OPENAI_API_KEY' })

    const { title, price, type, categoryName, seller, tone = 'friendly', existing, existingDescription, description } = (req.body || {}) as any
    if (!title) return res.status(400).json({ error: 'Missing title' })

    const sys = `You are a helpful product copywriter for an online marketplace in Australia. Write concise, persuasive descriptions (120–220 words) with short paragraphs.`
    const existingNotes = String(existing || existingDescription || description || '').trim()
    const user = `Write a ${tone} product description for the following item:\n\nName: ${title}\n${Number.isFinite(Number(price)) ? `Price: A$${Number(price)}` : ''}\n${type ? `Type: ${type}` : ''}\n${categoryName ? `Category: ${categoryName}` : ''}\n${seller ? `Seller: ${seller}` : ''}\n${existingNotes ? `\nExisting notes/details (incorporate and improve):\n${existingNotes}` : ''}\n\nGuidelines:\n- Open with a strong single-sentence hook\n- Summarise key benefits (not just features)\n- Use clear, simple language; no hype words like “best ever”\n- Add a short scannable list of 3 benefit bullets\n- End with a one‑line call to action\n\nOutput as plain text with paragraphs separated by a blank line. Include the 3 bullets as a dash list.`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
        max_tokens: 350,
      }),
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      return res.status(500).json({ error: 'OpenAI error', detail: text })
    }
    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content?.trim?.() || ''
    return res.json({ description: content })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal Error' })
  }
}
