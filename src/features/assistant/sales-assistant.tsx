import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { Sparkles, ShoppingBag, Clock, CreditCard, AlertCircle, X, Paperclip, FileText } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { db } from '@/lib/data'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type {
  AssistantActionResult,
  AssistantAttachment,
  AssistantChatRequest,
  AssistantMessage,
  AssistantState,
  AssistantInfoField,
} from './types'

const STORAGE_KEY = 'hedgetech_assistant_chat_v1'

type UsageStats = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
} | null

const defaultState: AssistantState = {
  cart: [],
  recommendations: [],
  orders: [],
  appointments: [],
  pendingInfoRequests: [],
  metadata: undefined,
}

const welcomeMessage: AssistantMessage = {
  id: 'assistant-welcome',
  role: 'assistant',
  content:
    "Hi there! I'm Hedgetech's AI sales assistant. Tell me what you're shopping for or which service you need and I'll line up the best options, schedule bookings, and organise checkout for you.",
  createdAt: new Date().toISOString(),
  suggestions: ['Show me popular items', 'I want to book a service appointment'],
  fresh: false,
}

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Math.random().toString(36).slice(2)}`
}

const MAX_ATTACHMENTS = 3
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_FILE_TYPES = 'image/*,application/pdf'

type PendingAttachment = {
  id: string
  name: string
  type: string
  size: number
  data: string
  previewUrl?: string
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        const base64 = result.includes(',') ? result.split(',')[1] : result
        resolve(base64)
      } else {
        reject(new Error('Unsupported file reader result'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function formatBytes(size: number) {
  if (!Number.isFinite(size)) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} kB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

type SalesAssistantProps = {
  variant?: 'page' | 'modal'
  onClose?: () => void
}

export function SalesAssistant({ variant = 'page', onClose }: SalesAssistantProps) {
  const isModal = variant === 'modal'
  const navigate = useNavigate()
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [state, setState] = useState<AssistantState>(defaultState)
  const [customer, setCustomer] = useState<{ name?: string; email?: string; phone?: string }>({})
  const [input, setInput] = useState('')
  const [usage, setUsage] = useState<UsageStats>(null)
  const [hydrated, setHydrated] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messagesRef = useRef<AssistantMessage[]>([])
  const stateRef = useRef(state)
  const timersRef = useRef<number[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') {
      setMessages([welcomeMessage])
      setHydrated(true)
      return
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages.map((msg: AssistantMessage) => ({ ...msg, fresh: false })))
        } else {
          setMessages([welcomeMessage])
        }
        if (parsed.state) setState({ ...defaultState, ...parsed.state })
        if (parsed.customer) setCustomer(parsed.customer)
      } else {
        setMessages([welcomeMessage])
      }
    } catch (error) {
      console.warn('Failed to hydrate assistant history:', error)
      setMessages([welcomeMessage])
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      const serialisableMessages = messages.map(({ fresh, ...rest }) => rest)
      const payload = { messages: serialisableMessages, state, customer }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.warn('Failed to persist assistant history:', error)
    }
  }, [messages, state, customer, hydrated])

  useEffect(() => {
    messagesRef.current = messages
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id))
      timersRef.current = []
    }
  }, [])

  const pendingInfoFields = useMemo(() => {
    const latest = state.pendingInfoRequests.at(-1)
    return latest?.fields ?? []
  }, [state.pendingInfoRequests])

  const handleActionResults = useCallback(async (actions?: AssistantActionResult[]) => {
    if (!actions || !actions.length) return
    let cartUpdated = false
    for (const action of actions) {
      if (action.status !== 'applied') continue
      if (action.type === 'add_to_cart') {
        const items = Array.isArray(action.items) ? action.items : []
        for (const item of items) {
          const productId = String(item.productId || '')
          if (!productId) continue
          const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1
          try {
            await db.addToCart(productId, quantity)
            cartUpdated = true
          } catch (error) {
            console.error('Failed to sync cart item from assistant', error)
          }
        }
      }
      if (action.type === 'book_service') {
        toast.success('Service appointment captured. We will confirm availability shortly.')
      }
      if (action.type === 'generate_payment_link') {
        toast.success('Payment link generated. Check the assistant message for details.')
      }
    }
    if (cartUpdated) {
      toast.success('Items added to your cart')
      navigate({ to: '/marketplace/checkout' })
    }
  }, [navigate])

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    const availableSlots = Math.max(0, MAX_ATTACHMENTS - pendingAttachments.length)
    if (!availableSlots) {
      toast.error(`You can attach up to ${MAX_ATTACHMENTS} files per message`)
      event.target.value = ''
      return
    }
    const selected = files.slice(0, availableSlots)
    const processed: PendingAttachment[] = []
    for (const file of selected) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`${file.name} is too large (max ${formatBytes(MAX_ATTACHMENT_SIZE)})`)
        continue
      }
      try {
        const data = await fileToBase64(file)
        const mime = file.type || 'application/octet-stream'
        const previewUrl = mime.startsWith('image/') || mime === 'application/pdf'
          ? `data:${mime};base64,${data}`
          : undefined
        processed.push({
          id: generateId('file'),
          name: file.name,
          type: mime,
          size: file.size,
          data,
          previewUrl,
        })
      } catch (error) {
        console.error('Failed to read attachment', error)
        toast.error(`Could not attach ${file.name}`)
      }
    }
    if (processed.length) {
      setPendingAttachments((prev) => [...prev, ...processed])
    }
    event.target.value = ''
  }

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const mutation = useMutation({
    mutationFn: async ({
      text,
      userMessage,
      attachments,
    }: {
      text: string
      userMessage: AssistantMessage
      attachments?: AssistantAttachment[]
    }) => {
      if (!db.salesAssistantChat) throw new Error('AI assistant is not available in local mode.')
      const history = messagesRef.current.slice(-29)
      const baseConversation = history.map((item) => ({
        role: item.role,
        content: item.content,
        createdAt: item.createdAt,
      }))
      const payload: AssistantChatRequest = {
        message: text,
        conversation: [...baseConversation, { role: userMessage.role, content: userMessage.content, createdAt: userMessage.createdAt }],
        state: stateRef.current,
        customer,
        attachments,
      }
      return db.salesAssistantChat(payload)
    },
    onSuccess: async (response) => {
      setUsage(response.usage ?? null)
      setState(response.state)
      const assistantMessage: AssistantMessage = {
        id: response.message.id || generateId('assistant'),
        role: 'assistant',
        content: response.message.content,
        createdAt: response.message.createdAt,
        actions: response.message.actions,
        suggestions: response.message.suggestions,
        fresh: true,
      }
      setMessages((prev) => [...prev, assistantMessage])
      const timer = window.setTimeout(() => {
        setMessages((prev) => prev.map((msg) => (msg.id === assistantMessage.id ? { ...msg, fresh: false } : msg)))
        timersRef.current = timersRef.current.filter((id) => id !== timer)
      }, 1600)
      timersRef.current.push(timer)
      await handleActionResults(response.message.actions)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Something went wrong'
      toast.error(message)
    },
  })

  const handleSend = useCallback(async (value?: string) => {
    if (mutation.isPending) return
    const rawText = (value ?? input).trim()
    if (!rawText && pendingAttachments.length === 0) return
    const text = rawText || 'Please review the attached files and advise next steps.'
    const attachmentsMeta = pendingAttachments.map((item) => ({
      name: item.name,
      type: item.type,
      size: item.size,
      url: item.previewUrl,
    }))
    const payloadAttachments: AssistantAttachment[] = pendingAttachments.map((item) => ({
      name: item.name,
      type: item.type,
      size: item.size,
      data: item.data,
    }))
    const userMessage: AssistantMessage = {
      id: generateId('user'),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      fresh: false,
      attachments: attachmentsMeta,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    const previousAttachments = pendingAttachments
    setPendingAttachments([])
    try {
      await mutation.mutateAsync({ text, userMessage, attachments: payloadAttachments })
    } catch (e) {
      // handled in onError
      if (previousAttachments.length) {
        setPendingAttachments(previousAttachments)
      }
    }
  }, [input, mutation, pendingAttachments])

  const latestAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i]
    }
    return null
  }, [messages])

  const renderInfoFieldLabel = (field: AssistantInfoField) => {
    switch (field) {
      case 'customer_name':
        return 'Customer name'
      case 'customer_email':
        return 'Email address'
      case 'customer_phone':
        return 'Phone number'
      case 'address':
        return 'Delivery address'
      case 'service_time':
        return 'Service date/time'
      case 'product_preference':
        return 'Product preferences'
      case 'budget':
        return 'Budget'
      default:
        return field
    }
  }

  return (
    <div className={cn(isModal ? 'flex h-full flex-col gap-4' : 'grid gap-6 lg:grid-cols-[2fr_1fr]')}>
      <div className={cn(
        'flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm',
        isModal ? 'h-full overflow-hidden' : 'h-[calc(100vh-9rem)]'
      )}>
        <div className='flex items-center justify-between border-b border-slate-100 px-6 py-4'>
          <div className='flex items-center gap-2 text-base font-semibold text-slate-900'>
            <Sparkles className='h-5 w-5 text-emerald-500' />
            Hedgetech AI Concierge
          </div>
          {isModal ? (
            <button
              type='button'
              className='rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700'
              onClick={onClose}
              aria-label='Close assistant'
            >
              <X className='h-4 w-4' />
            </button>
          ) : null}
        </div>
        <div className='flex flex-1 flex-col overflow-hidden'>
          <div ref={scrollRef} className='flex-1 space-y-6 overflow-y-auto px-6 py-6'>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {mutation.isPending ? (
              <div className='flex justify-start'>
                <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm'>Assistant is thinking…</div>
              </div>
            ) : null}
          </div>

          <div className='border-t border-slate-100 px-6 py-4'>
            {pendingInfoFields.length ? (
              <div className='mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700'>
                <AlertCircle className='mt-0.5 h-4 w-4 flex-none' />
                <div>
                  <span className='font-medium'>Required to proceed:</span>{' '}
                  {pendingInfoFields.map((field, index) => (
                    <span key={field}>
                      {renderInfoFieldLabel(field)}{index < pendingInfoFields.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <form
              className='flex flex-col gap-2'
              onSubmit={(event) => {
                event.preventDefault()
                handleSend()
              }}
            >
              {pendingAttachments.length ? (
                <div className='space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600'>
                  <div className='text-[11px] font-semibold uppercase text-muted-foreground'>Attachments</div>
                  <div className='flex flex-col gap-2'>
                    {pendingAttachments.map((file) => (
                      <div key={file.id} className='flex items-center gap-3 rounded-md border border-slate-200 bg-white p-2 shadow-xs'>
                        {file.type.startsWith('image/') ? (
                          <img src={file.previewUrl} alt={file.name} className='h-10 w-10 rounded-sm object-cover' />
                        ) : (
                          <FileText className='h-5 w-5 text-slate-400' />
                        )}
                        <div className='flex-1'>
                          <div className='font-medium text-slate-800'>{file.name}</div>
                          <div className='text-[11px] text-muted-foreground'>{formatBytes(file.size)}</div>
                        </div>
                        <button
                          type='button'
                          className='rounded-full border border-slate-200 p-1 text-slate-400 transition hover:border-slate-300 hover:text-slate-600'
                          onClick={() => removeAttachment(file.id)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className='h-3.5 w-3.5' />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <Textarea
                placeholder='Ask about a product, describe what you need, or request an order...'
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
                className='min-h-[96px] resize-none'
              />
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex flex-wrap gap-2'>
                  {latestAssistant?.suggestions?.map((suggestion) => (
                    <Button key={suggestion} type='button' variant='outline' size='sm' onClick={() => handleSend(suggestion)}>
                      {suggestion}
                    </Button>
                  ))}
                </div>
                <div className='flex items-center gap-2'>
                  <Button type='button' variant='outline' size='icon' onClick={handleAttachmentClick} aria-label='Attach files'>
                    <Paperclip className='h-4 w-4' />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept={ACCEPTED_FILE_TYPES}
                    multiple
                    onChange={handleFilesSelected}
                    className='hidden'
                  />
                  <Button type='submit' disabled={mutation.isPending}>
                    {mutation.isPending ? 'Sending…' : 'Send'}
                  </Button>
                </div>
              </div>
            </form>
            {usage ? (
              <div className='mt-2 text-[11px] text-muted-foreground'>Model tokens • Prompt {usage.prompt_tokens ?? 0} · Completion {usage.completion_tokens ?? 0}</div>
            ) : null}
          </div>
        </div>
      </div>

      {!isModal ? (
        <StateSummary state={state} variant='panel' />
      ) : null}

      {!isModal ? (
        <div className='flex flex-col gap-6'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Customer details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <label className='block space-y-1'>
                <span className='text-xs font-medium text-muted-foreground'>Name</span>
                <input
                  value={customer.name ?? ''}
                  onChange={(event) => setCustomer((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder='e.g. Olivia Nguyen'
                  className='w-full rounded-md border border-slate-200 px-2 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-emerald-200'
                />
              </label>
              <label className='block space-y-1'>
                <span className='text-xs font-medium text-muted-foreground'>Email</span>
                <input
                  value={customer.email ?? ''}
                  onChange={(event) => setCustomer((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder='name@example.com'
                  className='w-full rounded-md border border-slate-200 px-2 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-emerald-200'
                  type='email'
                />
              </label>
              <label className='block space-y-1'>
                <span className='text-xs font-medium text-muted-foreground'>Phone</span>
                <input
                  value={customer.phone ?? ''}
                  onChange={(event) => setCustomer((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder='+61 400 000 000'
                  className='w-full rounded-md border border-slate-200 px-2 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-emerald-200'
                />
              </label>
              <p className='text-[11px] text-muted-foreground'>Shared with the assistant so it can complete bookings and invoices without asking twice.</p>
            </CardContent>
          </Card>
      </div>
      ) : null}
    </div>
  )
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isAssistant = message.role === 'assistant'
  const [displayText, setDisplayText] = useState(message.content)
  const attachments = Array.isArray(message.attachments) ? message.attachments : []

  useEffect(() => {
    if (!isAssistant || message.fresh !== true) {
      setDisplayText(message.content)
      return
    }
    const text = message.content
    let index = 0
    const step = Math.max(1, Math.floor(text.length / 120))
    setDisplayText('')
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + step)
      setDisplayText(text.slice(0, index))
      if (index >= text.length) {
        window.clearInterval(timer)
      }
    }, 16)
    return () => {
      window.clearInterval(timer)
    }
  }, [isAssistant, message.content, message.fresh, message.id])

  return (
    <div className={cn('flex w-full flex-col gap-2 text-sm', isAssistant ? 'items-start' : 'items-end')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
          isAssistant ? 'rounded-tl-none border border-slate-200 bg-white text-slate-700' : 'rounded-tr-none bg-emerald-600 text-white'
        )}
      >
        <div className='prose prose-sm max-w-none whitespace-pre-wrap break-words text-slate-700 prose-headings:text-slate-800 prose-strong:text-slate-900 prose-ul:ml-4 prose-a:text-emerald-600 hover:prose-a:text-emerald-500'>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt }) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src ?? ''}
                  alt={alt ?? ''}
                  className='mt-2 w-full rounded-lg border border-slate-100 object-cover shadow-sm'
                />
              ),
              a: ({ href, children }) => (
                <a href={href} target='_blank' rel='noreferrer'>
                  {children}
                </a>
              ),
            }}
          >
            {displayText}
          </ReactMarkdown>
        </div>
        {attachments.length ? (
          <div className='mt-3 grid gap-2'>
            {attachments.map((attachment, index) => {
              const key = `${attachment.name || 'attachment'}-${index}`
              const isImage = typeof attachment.type === 'string' && attachment.type.startsWith('image/')
              const hasUrl = typeof attachment.url === 'string' && attachment.url.length > 0
              if (isImage && hasUrl) {
                return (
                  <img
                    key={key}
                    src={attachment.url}
                    alt={attachment.name || 'Attachment'}
                    className='max-h-48 w-full rounded-lg border border-slate-200 object-cover'
                    loading='lazy'
                  />
                )
              }
              if (hasUrl) {
                return (
                  <a
                    key={key}
                    href={attachment.url}
                    download={attachment.name}
                    className='inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-100'
                  >
                    <FileText className='h-3.5 w-3.5 text-slate-500' />
                    <span className='truncate'>{attachment.name || 'Attachment'}</span>
                  </a>
                )
              }
              return (
                <div
                  key={key}
                  className='inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'
                >
                  <FileText className='h-3.5 w-3.5 text-slate-500' />
                  <span>{attachment.name || 'Attachment'}</span>
                </div>
              )
            })}
          </div>
        ) : null}
        {isAssistant && message.actions?.length ? (
          <div className='mt-3 space-y-3'>
            {message.actions.map((action, index) => (
              <ActionSummary key={`${action.type}-${index}`} action={action} />
            ))}
          </div>
        ) : null}
      </div>
      {message.createdAt ? (
        <div className='text-[11px] text-muted-foreground'>
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </div>
      ) : null}
    </div>
  )
}

function ActionSummary({ action }: { action: AssistantActionResult }) {
  if (action.status === 'error') {
    return (
      <div className='rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700'>
        Unable to execute {action.type.replace(/_/g, ' ')}: {action.error || 'Unknown error'}
      </div>
    )
  }

  switch (action.type) {
    case 'recommend_products': {
      const products = Array.isArray(action.products) ? action.products : []
      if (!products.length) return null
      return (
        <div className='space-y-2'>
          <div className='flex items-center gap-2 text-xs font-semibold text-emerald-700'>
            <Sparkles className='h-3.5 w-3.5' />
            Suggested picks
          </div>
          <div className='grid gap-3 md:grid-cols-2'>
            {products.map((product: any) => (
              <div key={product.productId} className='rounded-lg border border-slate-200 bg-white p-3 shadow-xs'>
                <div className='flex items-start gap-3'>
                  {product.image ? (
                    <img src={product.image} alt={product.title || 'Recommended item'} className='h-12 w-12 flex-none rounded-md object-cover' />
                  ) : null}
                  <div className='flex-1'>
                    <div className='text-sm font-semibold text-slate-800'>{product.title || 'Recommended item'}</div>
                    {product.reason ? <div className='text-xs text-muted-foreground'>{product.reason}</div> : null}
                  </div>
                </div>
                <div className='mt-2 flex items-center justify-between text-xs text-slate-500'>
                  <Badge variant='secondary'>{product.type === 'service' ? 'Service' : 'Goods'}</Badge>
                  {product.price != null ? <span className='font-medium text-slate-900'>A${product.price}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    case 'add_to_cart': {
      const items = Array.isArray(action.items) ? action.items : []
      if (!items.length) return null
      return (
        <div className='rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'>
          <span className='font-semibold'>Cart updated:</span>{' '}
          {items.map((item: any, index: number) => (
            <span key={item.productId}>
              {item.title || item.productId} × {item.quantity || 1}
              {item.appointmentSlot ? ` @ ${new Date(item.appointmentSlot).toLocaleString()}` : ''}
              {index < items.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )
    }
    case 'create_order': {
      const orders = Array.isArray(action.orders) ? action.orders : []
      if (!orders.length) return null
      return (
        <div className='space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs'>
          <div className='flex items-center gap-2 text-xs font-semibold text-slate-800'>
            <ShoppingBag className='h-3.5 w-3.5 text-emerald-600' />
            Order created
          </div>
          {orders.map((order: any) => (
            <div key={order.id} className='flex items-center justify-between gap-3'>
              <div>#{String(order.id).slice(0, 8)}</div>
              <div className='font-medium'>A${order.total}</div>
            </div>
          ))}
        </div>
      )
    }
    case 'generate_payment_link': {
      const link = typeof action.paymentLink === 'string' ? action.paymentLink : undefined
      if (!link) return null
      return (
        <a
          className='inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50'
          href={link}
        >
          <CreditCard className='h-3.5 w-3.5' />
          Complete payment
        </a>
      )
    }
    case 'ask_information': {
      const fields = Array.isArray(action.fields) ? action.fields : []
      return (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700'>
          <span className='font-semibold'>Need info:</span>{' '}
          {fields.join(', ')}
        </div>
      )
    }
    default:
      return null
  }
}

type StateSummaryVariant = 'panel' | 'compact'

function StateSummary({ state, variant = 'panel' }: { state: AssistantState; variant?: StateSummaryVariant }) {
  if (variant === 'compact') {
    return (
      <div className='space-y-4 text-sm text-slate-600'>
        <section>
          <div className='text-xs font-semibold uppercase text-muted-foreground'>Cart</div>
          {state.cart.length ? (
            <ul className='mt-1 space-y-1 text-xs'>
              {state.cart.map((item) => (
                <li key={item.productId}>
                  {item.productId} × {item.quantity}
                  {item.appointmentSlot ? ` · ${new Date(item.appointmentSlot).toLocaleString()}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className='mt-1 text-xs text-muted-foreground'>No items staged yet.</p>
          )}
        </section>
        <section>
          <div className='text-xs font-semibold uppercase text-muted-foreground'>Appointments</div>
          {state.appointments.length ? (
            <ul className='mt-1 space-y-1 text-xs'>
              {state.appointments.map((appointment) => (
                <li key={`${appointment.productId}-${appointment.slot}`}>
                  {appointment.productId} — {new Date(appointment.slot).toLocaleString()} ({appointment.status || 'requested'})
                </li>
              ))}
            </ul>
          ) : (
            <p className='mt-1 text-xs text-muted-foreground'>No bookings yet.</p>
          )}
        </section>
        <section>
          <div className='text-xs font-semibold uppercase text-muted-foreground'>Orders</div>
          {state.orders.length ? (
            <ul className='mt-1 space-y-1 text-xs'>
              {state.orders.map((order) => (
                <li key={order.id}>
                  #{String(order.id).slice(0, 8)} — A${order.total} ({order.status})
                </li>
              ))}
            </ul>
          ) : (
            <p className='mt-1 text-xs text-muted-foreground'>No orders created yet.</p>
          )}
        </section>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Conversation snapshot</CardTitle>
      </CardHeader>
      <CardContent className='space-y-5 text-sm'>
        <section className='space-y-2'>
          <div className='flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground'>
            <ShoppingBag className='h-3.5 w-3.5 text-emerald-600' />
            Cart
          </div>
          {state.cart.length ? (
            <ul className='space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-700'>
              {state.cart.map((item) => (
                <li key={item.productId}>
                  {item.productId} × {item.quantity}
                  {item.appointmentSlot ? ` · ${new Date(item.appointmentSlot).toLocaleString()}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-xs text-muted-foreground'>No items staged yet.</p>
          )}
        </section>

        <section className='space-y-2'>
          <div className='flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground'>
            <Clock className='h-3.5 w-3.5 text-indigo-600' />
            Appointments
          </div>
          {state.appointments.length ? (
            <ul className='space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-700'>
              {state.appointments.map((appointment) => (
                <li key={`${appointment.productId}-${appointment.slot}`}>
                  {appointment.productId} — {new Date(appointment.slot).toLocaleString()}{' '}
                  <Badge variant='outline' className='ml-1 text-[10px] capitalize'>
                    {appointment.status || 'requested'}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-xs text-muted-foreground'>No bookings yet.</p>
          )}
        </section>

        <section className='space-y-2'>
          <div className='flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground'>
            <CreditCard className='h-3.5 w-3.5 text-purple-600' />
            Orders
          </div>
          {state.orders.length ? (
            <ul className='space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-700'>
              {state.orders.map((order) => (
                <li key={order.id} className='flex flex-wrap items-center justify-between gap-2'>
                  <span>#{String(order.id).slice(0, 8)}</span>
                  <span className='font-medium text-slate-900'>A${order.total}</span>
                  <Badge variant='outline' className='text-[10px] capitalize'>
                    {order.status}
                  </Badge>
                  {order.paymentLink ? (
                    <a className='text-[11px] text-emerald-600 underline' href={order.paymentLink}>
                      Payment link
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-xs text-muted-foreground'>No orders created yet.</p>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
