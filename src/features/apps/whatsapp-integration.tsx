import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { MessageCircle, Send, Share2, Users } from 'lucide-react'
import { db, type Product } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type WhatsAppSurface = 'dm' | 'group' | 'channel'

export function WhatsAppIntegration() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [accessToken, setAccessToken] = useState('')
  const [businessPhoneId, setBusinessPhoneId] = useState('')
  const [defaultFromNumber, setDefaultFromNumber] = useState('')
  const [groupInvite, setGroupInvite] = useState('')
  const [channelInvite, setChannelInvite] = useState('')
  const [connectedAt, setConnectedAt] = useState<string | null>(null)
  const [surfaces, setSurfaces] = useState<Record<WhatsAppSurface, boolean>>({
    dm: true,
    group: false,
    channel: false,
  })
  const [welcomeTemplate, setWelcomeTemplate] = useState(
    `Hey {{first_name}}, Hedgetech concierge here. Reply with what you're sourcing and I'll match you with {{product.title}} or build a bundle.`
  )
  const [promoTemplate, setPromoTemplate] = useState(
    `🚀 Fresh drop: {{product.title}} now available. Tap for specs + checkout or type assistant for a curated quote.`
  )
  const [testPrompt, setTestPrompt] = useState('')
  const [testReply, setTestReply] = useState('')
  const [savingConnection, setSavingConnection] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const list = await db.listProducts()
        if (!mounted) return
        setProducts(list)
        setSelectedProducts(list.slice(0, 3).map((item) => item.id))
      } catch {
        if (mounted) {
          setProducts([])
          setSelectedProducts([])
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const highlightProducts = useMemo(() => products.slice(0, 9), [products])

  function toggleProduct(id: string) {
    setSelectedProducts((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  function toggleSurface(key: WhatsAppSurface) {
    setSurfaces((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleTestReply() {
    if (!testPrompt.trim()) {
      toast.error('Enter a customer prompt to test the bot.')
      return
    }
    const product = products.find((p) => selectedProducts.includes(p.id))
    const parts: string[] = []
    parts.push(`Hi! We match buyers with Hedgetech verified sellers.`)
    if (product) {
      parts.push(`Sounds like ${product.title} fits. It’s ${product.type} priced at A$${product.price}.`)
    }
    if (surfaces.dm) parts.push('I can send DM-ready checkout links right here.')
    if (surfaces.group) parts.push('Need a team review? Share this in your WA group; I’ll keep context.')
    if (surfaces.channel) parts.push('Channel broadcasts go out every morning with the latest inventory.')
    parts.push('Say "assistant" anytime to switch to the Hedgetech concierge.')
    setTestReply(parts.join(' '))
  }

  async function handleSaveConnection() {
    if (!accessToken.trim() || !businessPhoneId.trim() || !defaultFromNumber.trim()) {
      toast.error('Add the Meta access token, phone ID, and default number.')
      return
    }
    setSavingConnection(true)
    setTimeout(() => {
      setConnectedAt(new Date().toLocaleString())
      setSavingConnection(false)
      toast.success('WhatsApp Cloud API connected. Buyers can now DM or join your broadcast surfaces.')
    }, 900)
  }

  function handleSaveAutomation() {
    toast.success('WhatsApp automation saved. Campaigns will use the templates and product selections.')
  }

  return (
    <div className='mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8'>
      <header className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
        <div className='flex flex-wrap items-center gap-4'>
          <div className='rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-600'>
            <MessageCircle className='h-6 w-6' />
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>WhatsApp automation</p>
            <h1 className='text-2xl font-semibold text-slate-900'>Converse with buyers everywhere</h1>
            <p className='text-sm text-slate-600'>
              Plug in Meta’s WhatsApp Cloud API to handle DMs, run nurture broadcasts, and let the AI concierge handle product questions.
            </p>
          </div>
        </div>
      </header>

      <section className='grid gap-6 lg:grid-cols-2'>
        <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Meta Cloud API</h2>
            {connectedAt ? (
              <Badge variant='secondary' className='bg-emerald-50 text-emerald-800'>
                Connected · {connectedAt}
              </Badge>
            ) : (
              <Badge variant='outline'>Not connected</Badge>
            )}
          </div>
          <p className='text-sm text-slate-600'>Use developers.facebook.com to create an app, add the WhatsApp product, and grab the credentials below.</p>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label htmlFor='wa-access-token'>Permanent access token</Label>
              <Input
                id='wa-access-token'
                type='password'
                placeholder='EAAG...'
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='wa-phone-id'>Business phone ID</Label>
              <Input
                id='wa-phone-id'
                placeholder='123456789012345'
                value={businessPhoneId}
                onChange={(event) => setBusinessPhoneId(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='wa-number'>WhatsApp-enabled number</Label>
              <Input
                id='wa-number'
                placeholder='+61 400 000 000'
                value={defaultFromNumber}
                onChange={(event) => setDefaultFromNumber(event.target.value)}
              />
            </div>
            <div className='rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500'>
              Webhook reminder: expose <code className='rounded bg-white px-1 py-0.5 text-[10px]'>/api/integrations/whatsapp/webhook</code> for incoming events.
            </div>
          </div>
          <Button onClick={handleSaveConnection} disabled={savingConnection}>
            {savingConnection ? 'Connecting…' : 'Save connection'}
          </Button>
        </div>

        <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Surfaces & invites</h2>
            <Badge variant='secondary' className='bg-blue-50 text-blue-700'>
              Multi-channel
            </Badge>
          </div>
          <p className='text-sm text-slate-600'>Choose where buyers interact: one-to-one concierge, curated groups, or broadcast channels.</p>
          <div className='space-y-3'>
            <button
              type='button'
              onClick={() => toggleSurface('dm')}
              className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left ${
                surfaces.dm ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'
              }`}
            >
              <span className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
                <Send className='h-4 w-4' /> Concierge DMs
              </span>
              <Switch checked={surfaces.dm} />
            </button>
            <div className='space-y-1'>
              <button
                type='button'
                onClick={() => toggleSurface('group')}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left ${
                  surfaces.group ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'
                }`}
              >
                <span className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
                  <Users className='h-4 w-4' /> VIP group drops
                </span>
                <Switch checked={surfaces.group} />
              </button>
              {surfaces.group ? (
                <Input
                  placeholder='https://chat.whatsapp.com/...'
                  value={groupInvite}
                  onChange={(event) => setGroupInvite(event.target.value)}
                />
              ) : null}
            </div>
            <div className='space-y-1'>
              <button
                type='button'
                onClick={() => toggleSurface('channel')}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left ${
                  surfaces.channel ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'
                }`}
              >
                <span className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
                  <Share2 className='h-4 w-4' /> Broadcast channel
                </span>
                <Switch checked={surfaces.channel} />
              </button>
              {surfaces.channel ? (
                <Input
                  placeholder='https://whatsapp.com/channel/...'
                  value={channelInvite}
                  onChange={(event) => setChannelInvite(event.target.value)}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className='grid gap-6 lg:grid-cols-2'>
        <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Product sync</h2>
            <Button variant='ghost' size='sm' onClick={() => setSelectedProducts(highlightProducts.map((p) => p.id))}>
              Select all
            </Button>
          </div>
          <p className='text-sm text-slate-600'>Pick the listings the bot can sell or reference when buyers interact.</p>
          <div className='grid gap-3 sm:grid-cols-2'>
            {highlightProducts.map((product) => {
              const selected = selectedProducts.includes(product.id)
              return (
                <button
                  key={product.id}
                  type='button'
                  onClick={() => toggleProduct(product.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    selected ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-emerald-200'
                  }`}
                >
                  <div className='flex items-center justify-between text-xs text-slate-500'>
                    <span>{product.type === 'service' ? 'Service' : 'Product'}</span>
                    {selected ? <Badge variant='secondary'>Synced</Badge> : null}
                  </div>
                  <p className='mt-1 text-sm font-semibold text-slate-900'>{product.title}</p>
                  <p className='text-xs text-slate-500'>A${product.price}</p>
                </button>
              )
            })}
          </div>
          {!highlightProducts.length ? (
            <div className='rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500'>Add listings in the seller cockpit to sync them here.</div>
          ) : null}
        </div>

        <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Automations & templates</h2>
            <Badge variant='secondary' className='bg-purple-50 text-purple-700'>
              Concierge powered
            </Badge>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='welcome-template'>DM welcome template</Label>
            <Textarea id='welcome-template' rows={4} value={welcomeTemplate} onChange={(event) => setWelcomeTemplate(event.target.value)} className='text-sm' />
            <p className='text-xs text-slate-500'>
              Include tokens such as <code className='rounded bg-slate-100 px-1 py-0.5 text-[10px]'>{'{{first_name}}'}</code> or{' '}
              <code className='rounded bg-slate-100 px-1 py-0.5 text-[10px]'>{'{{product.title}}'}</code>.
            </p>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='promo-template'>Group/channel promo template</Label>
            <Textarea id='promo-template' rows={4} value={promoTemplate} onChange={(event) => setPromoTemplate(event.target.value)} className='text-sm' />
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button onClick={handleSaveAutomation}>Save automation</Button>
            <Button variant='secondary' onClick={handleTestReply}>
              Generate sample reply
            </Button>
          </div>
          {testReply ? <div className='rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700'>{testReply}</div> : null}
        </div>
      </section>

      <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
        <h2 className='text-lg font-semibold text-slate-900'>Preview the bot experience</h2>
        <p className='text-sm text-slate-600'>Ask something a buyer would DM. The reply uses your current configurations.</p>
        <div className='mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]'>
          <Textarea rows={3} placeholder='e.g. “Do you have sustainable office chairs under $500?”' value={testPrompt} onChange={(event) => setTestPrompt(event.target.value)} />
          <div className='flex flex-col gap-2'>
            <Button variant='secondary' onClick={handleTestReply}>
              Simulate reply
            </Button>
            <Button variant='ghost' onClick={() => setTestReply('')}>
              Clear preview
            </Button>
            <Link to='/marketplace/assistant' className='text-center text-xs font-semibold text-emerald-700 hover:underline'>
              Continue in AI concierge →
            </Link>
          </div>
        </div>
        {testReply ? (
          <div className='mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700'>
            <strong className='text-slate-900'>Bot:</strong> {testReply}
          </div>
        ) : null}
      </section>
    </div>
  )
}
