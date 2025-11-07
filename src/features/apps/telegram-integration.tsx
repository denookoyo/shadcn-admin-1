import { useEffect, useMemo, useState } from 'react'
import { Bot, PlugZap, Send, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { db, type Product } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type CampaignCadence = 'daily' | 'weekly' | 'launch'

export function TelegramIntegration() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [botToken, setBotToken] = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [autoReplies, setAutoReplies] = useState(true)
  const [isSavingConnection, setIsSavingConnection] = useState(false)
  const [cadence, setCadence] = useState<CampaignCadence>('daily')
  const [sendTime, setSendTime] = useState('09:00')
  const [messageTemplate, setMessageTemplate] = useState(
    `🔥 {{product.title}} is live on Hedgetech.\n\n{{product.description}}\n\nAsk the AI concierge for a tailored bundle or tap the checkout link.`
  )
  const [connectedAt, setConnectedAt] = useState<string | null>(null)
  const [intentCatalog, setIntentCatalog] = useState<Record<string, boolean>>({
    catalog: true,
    availability: true,
    pricing: true,
    concierge: true,
  })
  const [testQuestion, setTestQuestion] = useState('')
  const [testAnswer, setTestAnswer] = useState('')
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const list = await db.listProducts()
        if (mounted) {
          setProducts(list)
          setSelectedProducts(list.slice(0, 4).map((item) => item.id))
        }
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

  const spotlightProducts = useMemo(() => {
    return products.slice(0, 8)
  }, [products])

  function toggleProduct(id: string) {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  async function handleSaveConnection() {
    if (!botToken.trim() || !botUsername.trim()) {
      toast.error('Enter both the bot token and bot username.')
      return
    }
    setIsSavingConnection(true)
    setTimeout(() => {
      setConnectedAt(new Date().toLocaleString())
      setIsSavingConnection(false)
      toast.success('Telegram bot connected. Users can now DM the bot for listings.')
    }, 900)
  }

  function handleSaveCampaign() {
    toast.success('Telegram automation saved. The concierge will craft posts from selected products.')
  }

  function handlePreview() {
    if (!selectedProducts.length) {
      toast.error('Select at least one product to preview a post.')
      return
    }
    const product = products.find((p) => p.id === selectedProducts[0])
    const preview = messageTemplate
      .replace('{{product.title}}', product?.title ?? 'Hedgetech pick')
      .replace('{{product.description}}', product?.description ?? 'Explore the listing for full details.')
    toast.message('Telegram preview', {
      description: preview,
    })
  }

  function handleIntentToggle(key: keyof typeof intentCatalog) {
    setIntentCatalog((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleTestExchange() {
    if (!testQuestion.trim()) {
      toast.error('Ask a sample question to test the bot.')
      return
    }
    if (!selectedProducts.length) {
      toast.error('Select at least one product so the bot has context.')
      return
    }
    const product = products.find((p) => p.id === selectedProducts[0])
    const answerParts: string[] = []
    if (intentCatalog.catalog) {
      answerParts.push(`We have ${products.length} live listings. A highlight right now is **${product?.title ?? 'our latest drop'}**.`)
    }
    if (intentCatalog.pricing) {
      answerParts.push(`Pricing starts at A$${product?.price ?? '—'} and includes Hedgetech buyer protection.`)
    }
    if (intentCatalog.availability) {
      answerParts.push(product?.type === 'service' ? 'Providers can confirm slots within 24h.' : 'Inventory ships within 48h across ANZ.')
    }
    if (intentCatalog.concierge) {
      answerParts.push('Need a curated bundle? Type "assistant" and the Hedgetech concierge continues the chat.')
    }
    setTestAnswer(answerParts.join(' '))
  }

  return (
    <div className='mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8'>
      <header className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
        <div className='flex flex-wrap items-center gap-4'>
          <div className='rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-600'>
            <Bot className='h-6 w-6' />
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>Telegram automation</p>
            <h1 className='text-2xl font-semibold text-slate-900'>Launch AI-driven Telegram drops</h1>
            <p className='text-sm text-slate-600'>
              Sync Hedgetech listings to your Telegram audience, let the concierge draft campaigns, and answer product questions automatically.
            </p>
          </div>
        </div>
      </header>

      <section className='grid gap-6 lg:grid-cols-2'>
        <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Connect your bot</h2>
            {connectedAt ? (
              <Badge variant='secondary' className='bg-emerald-50 text-emerald-800'>
                Connected · {connectedAt}
              </Badge>
            ) : (
              <Badge variant='outline' className='border-amber-200 text-amber-700'>
                Not connected
              </Badge>
            )}
          </div>
          <p className='text-sm text-slate-600'>Create a bot with @BotFather, paste the token, and share the bot username so buyers can DM it directly.</p>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label htmlFor='bot-token'>Bot token</Label>
              <Input
                id='bot-token'
                placeholder='123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'
                value={botToken}
                onChange={(event) => setBotToken(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='bot-username'>Bot username</Label>
              <Input
                id='bot-username'
                placeholder='@hedgetech_bot'
                value={botUsername}
                onChange={(event) => setBotUsername(event.target.value)}
              />
            </div>
            <div className='flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600'>
              <span>Auto-answer with AI concierge</span>
              <Switch checked={autoReplies} onCheckedChange={setAutoReplies} aria-label='Toggle concierge replies' />
            </div>
            <div className='flex flex-wrap gap-2 text-xs text-slate-500'>
              <span>1. Use @BotFather → /newbot</span>
              <span>2. Share the bot link (no channel admin needed)</span>
              <span>3. Paste the token above</span>
            </div>
          </div>
          <Button onClick={handleSaveConnection} disabled={isSavingConnection}>
            {isSavingConnection ? 'Connecting…' : 'Save connection'}
          </Button>
        </div>

        <div className='space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Product spotlight</h2>
            <Button variant='ghost' size='sm' onClick={() => setSelectedProducts(spotlightProducts.map((item) => item.id))}>
              Select top {spotlightProducts.length}
            </Button>
          </div>
          <p className='text-sm text-slate-600'>Pick the listings Telegram will feature. The concierge will blend specs, pricing, and delivery promises automatically.</p>
          <div className='grid gap-3 sm:grid-cols-2'>
            {spotlightProducts.map((product) => {
              const isSelected = selectedProducts.includes(product.id)
              return (
                <button
                  key={product.id}
                  type='button'
                  onClick={() => toggleProduct(product.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    isSelected ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-emerald-200'
                  }`}
                >
                  <div className='flex items-center justify-between text-xs text-slate-500'>
                    <span>{product.type === 'service' ? 'Service' : 'Product'}</span>
                    {isSelected ? <Badge variant='secondary'>Synced</Badge> : null}
                  </div>
                  <p className='mt-1 text-sm font-semibold text-slate-900'>{product.title}</p>
                  <p className='text-xs text-slate-500'>A${product.price}</p>
                </button>
              )
            })}
          </div>
          {!spotlightProducts.length ? (
            <div className='rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500'>
              Add listings in the seller cockpit to unlock Telegram campaigns.
            </div>
          ) : null}
        </div>
      </section>

      <section className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-slate-900'>Automation & creative</h2>
          <div className='inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
            <Sparkles className='h-3.5 w-3.5' /> Concierge powered
          </div>
        </div>
        <div className='mt-4 grid gap-4 md:grid-cols-3'>
          <div className='space-y-2'>
            <Label htmlFor='cadence'>Cadence</Label>
            <select
              id='cadence'
              className='rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm'
              value={cadence}
              onChange={(event) => setCadence(event.target.value as CampaignCadence)}
            >
              <option value='daily'>Daily drops</option>
              <option value='weekly'>Weekly digest</option>
              <option value='launch'>When new listings go live</option>
            </select>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='send-time'>Send time</Label>
            <Input id='send-time' type='time' value={sendTime} onChange={(event) => setSendTime(event.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label>Concierge hand-off</Label>
            <p className='text-xs text-slate-500'>
              Buyers can continue the journey in the{' '}
              <Link to='/marketplace/assistant' className='font-semibold text-emerald-700 hover:underline'>
                AI concierge
              </Link>
              .
            </p>
          </div>
        </div>
        <div className='mt-4 space-y-2'>
          <Label htmlFor='message-template'>Message template</Label>
          <Textarea
            id='message-template'
            rows={6}
            value={messageTemplate}
            onChange={(event) => setMessageTemplate(event.target.value)}
            className='text-sm'
          />
          <p className='text-xs text-slate-500'>
            Use tokens like <code className='rounded bg-slate-100 px-1 py-0.5 text-[10px]'>{'{{product.title}}'}</code> or{' '}
            <code className='rounded bg-slate-100 px-1 py-0.5 text-[10px]'>{'{{product.description}}'}</code>. The concierge fills in the rest.
          </p>
        </div>
        <div className='mt-4 flex flex-wrap gap-3'>
          <Button onClick={handleSaveCampaign} className='inline-flex items-center gap-2'>
            <PlugZap className='h-4 w-4' /> Save automation
          </Button>
          <Button variant='secondary' onClick={handlePreview} className='inline-flex items-center gap-2'>
            <Send className='h-4 w-4' /> Send preview
          </Button>
        </div>
        <div className='mt-6 grid gap-4 lg:grid-cols-2'>
          <div className='space-y-3 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600'>
            <div className='flex items-center justify-between'>
              <h3 className='font-semibold text-slate-900'>Bot intents</h3>
              <Badge variant='outline'>Conversational</Badge>
            </div>
            <p className='text-xs text-slate-500'>Toggle the domains the concierge can answer when users DM the bot.</p>
            <div className='space-y-2'>
              {[
                { key: 'catalog', label: 'Browse catalog' },
                { key: 'availability', label: 'Check delivery / booking windows' },
                { key: 'pricing', label: 'Quote pricing & promotions' },
                { key: 'concierge', label: 'Hand off to Hedgetech concierge' },
              ].map((intent) => (
                <button
                  type='button'
                  key={intent.key}
                  onClick={() => handleIntentToggle(intent.key as keyof typeof intentCatalog)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm ${
                    intentCatalog[intent.key as keyof typeof intentCatalog]
                      ? 'border-emerald-200 bg-white text-slate-900'
                      : 'border-slate-200 bg-white/70 text-slate-500'
                  }`}
                >
                  <span>{intent.label}</span>
                  <Switch checked={intentCatalog[intent.key as keyof typeof intentCatalog]} />
                </button>
              ))}
            </div>
          </div>

          <div className='space-y-3 rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600'>
            <div className='flex items-center justify-between'>
              <h3 className='font-semibold text-slate-900'>Test the conversation</h3>
              <Badge variant='secondary' className='bg-blue-50 text-blue-700'>
                Bot preview
              </Badge>
            </div>
            <p className='text-xs text-slate-500'>Ask what a buyer might ask. We’ll simulate the current bot response.</p>
            <Input
              placeholder='e.g., “What’s in the smart office bundle?”'
              value={testQuestion}
              onChange={(event) => setTestQuestion(event.target.value)}
            />
            <div className='flex gap-2'>
              <Button variant='secondary' className='flex-1' onClick={handleTestExchange}>
                Generate reply
              </Button>
              <Button variant='ghost' onClick={() => setTestAnswer('')}>
                Clear
              </Button>
            </div>
            {testAnswer ? (
              <div className='rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700'>
                {testAnswer}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
