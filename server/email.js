const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Hedgetech Marketplace <notifications@hedgetech.local>'

function normalizeRecipients(to) {
  if (!to) return []
  if (Array.isArray(to)) return to.filter(Boolean)
  return [to].filter(Boolean)
}

export async function sendMarketplaceEmail({ to, subject, html, from }) {
  if (!RESEND_API_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('RESEND_API_KEY not configured; skipping email send for "%s"', subject)
    }
    return
  }
  const recipients = normalizeRecipients(to)
  if (!recipients.length) return
  const fetchFn = typeof fetch === 'function' ? fetch : null
  if (!fetchFn) {
    console.warn('Global fetch unavailable; cannot send email for "%s"', subject)
    return
  }
  try {
    const response = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || RESEND_FROM,
        to: recipients,
        subject,
        html,
      }),
    })
    if (!response.ok) {
      const text = await response.text()
      console.error('Resend email send failed (%s): %s', response.status, text)
    }
  } catch (error) {
    console.error('Resend email send error:', error)
  }
}
