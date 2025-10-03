export type AssistantInfoField =
  | 'customer_name'
  | 'customer_email'
  | 'customer_phone'
  | 'address'
  | 'service_time'
  | 'product_preference'
  | 'budget'

export type AssistantCartItem = {
  productId: string
  quantity: number
  appointmentSlot?: string
  note?: string
}

export type AssistantRecommendation = {
  productId: string
  reason?: string
  matchScore?: number
  title?: string
  price?: number
  type?: 'goods' | 'service'
  image?: string
  slug?: string
}

export type AssistantAppointment = {
  productId: string
  slot: string
  status?: string
  note?: string
  orderId?: string
}

export type AssistantOrderSummary = {
  id: string
  total: number
  status: string
  paymentLink?: string | null
  accessCode?: string | null
  createdAt?: string
}

export type AssistantPendingInfoRequest = {
  fields: AssistantInfoField[]
  reason?: string
}

export type AssistantState = {
  cart: AssistantCartItem[]
  recommendations: AssistantRecommendation[]
  orders: AssistantOrderSummary[]
  appointments: AssistantAppointment[]
  pendingInfoRequests: AssistantPendingInfoRequest[]
  metadata?: Record<string, unknown>
}

export type AssistantActionResult = {
  type: string
  status: 'applied' | 'error' | 'ignored'
  error?: string
  [key: string]: unknown
}

export type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
  actions?: AssistantActionResult[]
  suggestions?: string[]
  fresh?: boolean
  attachments?: Array<{
    name: string
    type: string
    url?: string
    size?: number
  }>
}

export type AssistantAttachment = {
  name: string
  type: string
  size: number
  data: string
}

export type AssistantChatRequest = {
  message: string
  conversation: Array<Pick<AssistantMessage, 'role' | 'content' | 'createdAt'>>
  state?: AssistantState
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  attachments?: AssistantAttachment[]
}

export type AssistantChatResponse = {
  message: AssistantMessage
  state: AssistantState
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  } | null
  raw?: {
    reply: string
    actions?: unknown[]
    suggestions?: string[]
    summary?: string
  }
  createdOrders?: AssistantOrderSummary[]
}
