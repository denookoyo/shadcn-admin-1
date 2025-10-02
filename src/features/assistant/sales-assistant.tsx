import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Sparkles, ShoppingBag, Clock, CreditCard, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/data'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type {
  AssistantActionResult,
  AssistantChatRequest,
  AssistantMessage,
  AssistantState,
  AssistantInfoField,
} from './types'

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
}

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Math.random().toString(36).slice(2)}`
}

export function SalesAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([welcomeMessage])
  const [state, setState] = useState<AssistantState>(defaultState)
  const [customer, setCustomer] = useState<{ name?: string; email?: string; phone?: string }>({})
  const [input, setInput] = useState('')
  const [usage, setUsage] = useState<UsageStats>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messagesRef = useRef(messages)
  const stateRef = useRef(state)

  useEffect(() => {
    messagesRef.current = messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const pendingInfoFields = useMemo(() => {
    const latest = state.pendingInfoRequests.at(-1)
    return latest?.fields ?? []
  }, [state.pendingInfoRequests])

  const mutation = useMutation({
    mutationFn: async ({ text, userMessage }: { text: string; userMessage: AssistantMessage }) => {
      if (!db.salesAssistantChat) throw new Error('AI assistant is not available in local mode.')
      const baseConversation = messagesRef.current.map((item) => ({
        role: item.role,
        content: item.content,
        createdAt: item.createdAt,
      }))
      const payload: AssistantChatRequest = {
        message: text,
        conversation: [...baseConversation, { role: userMessage.role, content: userMessage.content, createdAt: userMessage.createdAt }],
        state: stateRef.current,
        customer,
      }
      return db.salesAssistantChat(payload)
    },
    onSuccess: (response) => {
      setUsage(response.usage ?? null)
      setState(response.state)
      const assistantMessage: AssistantMessage = {
        id: response.message.id || generateId('assistant'),
        role: 'assistant',
        content: response.message.content,
        createdAt: response.message.createdAt,
        actions: response.message.actions,
        suggestions: response.message.suggestions,
      }
      setMessages((prev) => [...prev, assistantMessage])
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Something went wrong'
      toast.error(message)
    },
  })

  const handleSend = async (value?: string) => {
    const text = (value ?? input).trim()
    if (!text) return
    const userMessage: AssistantMessage = {
      id: generateId('user'),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    try {
      await mutation.mutateAsync({ text, userMessage })
    } catch (e) {
      // error handled in onError
    }
  }

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
    <div className='grid gap-6 lg:grid-cols-[2fr_1fr]'>
      <Card className='flex h-[calc(100vh-9rem)] flex-col'>
        <CardHeader className='space-y-2 border-b'>
          <div className='flex items-center gap-2 text-base font-semibold'>
            <Sparkles className='h-5 w-5 text-emerald-500' />
            Hedgetech AI Concierge
          </div>
          <p className='text-sm text-muted-foreground'>Conversational selling powered by your live catalogue and OpenAI.</p>
        </CardHeader>
        <CardContent className='flex flex-1 flex-col gap-4 p-0'>
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
          <Separator />
          <div className='space-y-3 px-6 pb-6'>
            {pendingInfoFields.length ? (
              <div className='flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700'>
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
              <div className='flex items-center justify-between gap-2'>
                <div className='flex flex-wrap gap-2'>
                  {latestAssistant?.suggestions?.map((suggestion) => (
                    <Button key={suggestion} type='button' variant='outline' size='sm' onClick={() => handleSend(suggestion)}>
                      {suggestion}
                    </Button>
                  ))}
                </div>
                <Button type='submit' disabled={mutation.isPending}>
                  {mutation.isPending ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </form>
            {usage ? (
              <div className='text-[11px] text-muted-foreground'>Model tokens • Prompt {usage.prompt_tokens ?? 0} · Completion {usage.completion_tokens ?? 0}</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

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

        <StateSummary state={state} />
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isAssistant = message.role === 'assistant'
  return (
    <div className={cn('flex w-full flex-col gap-2 text-sm', isAssistant ? 'items-start' : 'items-end')}> 
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
          isAssistant ? 'rounded-tl-none border border-slate-200 bg-white text-slate-700' : 'rounded-tr-none bg-emerald-600 text-white'
        )}
      >
        <div className='whitespace-pre-wrap leading-relaxed'>{message.content}</div>
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
              <div key={product.productId} className='rounded-lg border border-slate-200 bg-white p-3 shadow-sm'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <div className='text-sm font-semibold text-slate-800'>{product.title || 'Recommended item'}</div>
                    <div className='text-xs text-muted-foreground'>{product.reason}</div>
                  </div>
                  <Badge variant='secondary'>{product.type === 'service' ? 'Service' : 'Goods'}</Badge>
                </div>
                <div className='mt-2 text-sm font-medium text-slate-900'>A${product.price ?? '—'}</div>
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
        <div className='space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm'>
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

function StateSummary({ state }: { state: AssistantState }) {
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
