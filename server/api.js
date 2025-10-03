import express from 'express'
import { z } from 'zod'
import pdfParse from 'pdf-parse'
import { getPrisma } from './prisma.js'
import { ensureAuth } from './auth.js'
import { sendMarketplaceEmail } from './email.js'

function imageForServer(query, w = 640, h = 640) {
  const provider = process.env.VITE_IMAGE_PROVIDER || 'picsum'
  if (provider === 'picsum') return `https://picsum.photos/seed/${encodeURIComponent(query)}/${w}/${h}`
  if (provider === 'placeholder') return `https://placehold.co/${w}x${h}?text=${encodeURIComponent(query)}`
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}`
}

// No seeding in API

export function createApiRouter() {
  const router = express.Router()
  const prisma = getPrisma()
  // Compute composite rating from average order reviews and negative reports
  function compositeRating(baseAvg = 5, negCount = 0) {
    const avg = Number.isFinite(baseAvg) && baseAvg > 0 ? baseAvg : 5
    const negatives = Number.isFinite(negCount) && negCount > 0 ? negCount : 0
    const penalty = Math.min(2.5, negatives * 0.8)
    return Math.max(1, Math.min(5, avg - penalty))
  }

  const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const WEEKDAY_FROM_INDEX = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  function normalizeDayToken(token) {
    if (!token) return null
    const lower = String(token).trim().toLowerCase()
    if (!lower) return null
    const match = DAY_NAMES.find((day) => day.startsWith(lower))
    return match || null
  }

  function normalizeOpenDays(value) {
    if (!value) return []
    const parts = Array.isArray(value) ? value : String(value).split(/[,\s]+/)
    const seen = new Set()
    for (const part of parts) {
      const day = normalizeDayToken(part)
      if (day) seen.add(day)
    }
    return Array.from(seen)
  }

  function parseIntOrNull(value, { min = Number.NEGATIVE_INFINITY } = {}) {
    if (value === undefined || value === null || value === '') return null
    const num = Number(value)
    if (!Number.isFinite(num)) return null
    const rounded = Math.round(num)
    if (rounded < min) return null
    return rounded
  }

  function parseIntOrDefault(value, defaultValue = 0, options = {}) {
    const parsed = parseIntOrNull(value, options)
    if (parsed === null || parsed === undefined) return defaultValue
    return parsed
  }

  function normalizeTimeString(value) {
    if (!value && value !== 0) return null
    const str = String(value).trim()
    if (!str) return null
    const match = str.match(/^(\d{1,2}):(\d{2})/)
    if (!match) return null
    const hours = String(Math.min(23, Math.max(0, Number(match[1])))).padStart(2, '0')
    const minutes = String(Math.min(59, Math.max(0, Number(match[2])))).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  function startOfDay(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  function addDays(date, days) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  function combineDateAndTime(baseDate, timeString) {
    const date = new Date(baseDate)
    if (!timeString) {
      date.setHours(9, 0, 0, 0)
      return date
    }
    const [hours, minutes] = timeString.split(':').map((value) => Number(value) || 0)
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  router.get('/health', (_req, res) => res.json({ ok: true }))

  // ---------------- Amazing Freight (Drivers) ----------------
  // Create a docket
  router.post('/driver/dockets', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const { date, truckId, project, startTime, endTime, hours, details, files } = req.body || {}
      const created = await prisma.docket.create({
        data: {
          driverId,
          date: new Date(date || Date.now()),
          truckId: truckId || null,
          project: project || null,
          startTime: startTime || null,
          endTime: endTime || null,
          hours: Number.isFinite(Number(hours)) ? Number(hours) : null,
          details: details || null,
          files: Array.isArray(files) ? files : [],
        },
      })
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/driver/dockets error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // List my dockets
  router.get('/driver/dockets', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const list = await prisma.docket.findMany({ where: { driverId }, orderBy: { date: 'desc' } })
      res.json(list)
    } catch (e) {
      console.error('GET /api/driver/dockets error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Submit hours (shift)
  router.post('/driver/shifts', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const { date, truckId, startTime, endTime, breakMin = 0 } = req.body || {}
      // compute total hours naive (expects HH:mm)
      function parseHM(s) { const [h, m] = String(s||'').split(':').map((x) => Number(x)||0); return h*60+m }
      const startM = parseHM(startTime)
      const endM = parseHM(endTime)
      let mins = Math.max(0, endM - startM - Number(breakMin||0))
      const totalHours = Math.round((mins/60) * 100) / 100
      const created = await prisma.shift.create({
        data: {
          driverId,
          date: new Date(date || Date.now()),
          truckId: truckId || null,
          startTime: startTime || '00:00',
          endTime: endTime || '00:00',
          breakMin: Number(breakMin || 0),
          totalHours,
        },
      })
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/driver/shifts error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // List my shifts
  router.get('/driver/shifts', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const list = await prisma.shift.findMany({ where: { driverId }, orderBy: { date: 'desc' } })
      res.json(list)
    } catch (e) {
      console.error('GET /api/driver/shifts error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Maintenance request
  router.post('/driver/maintenance', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const { date, truckId, category, severity, description, files } = req.body || {}
      const created = await prisma.maintenanceRequest.create({
        data: {
          driverId,
          date: date ? new Date(date) : new Date(),
          truckId: truckId || null,
          category: String(category || 'general'),
          severity: severity || null,
          description: String(description || ''),
          files: Array.isArray(files) ? files : [],
        },
      })
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/driver/maintenance error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/driver/maintenance', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const list = await prisma.maintenanceRequest.findMany({ where: { driverId }, orderBy: { date: 'desc' } })
      res.json(list)
    } catch (e) {
      console.error('GET /api/driver/maintenance error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Accident report
  router.post('/driver/accidents', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const { occurredAt, truckId, location, description, injuries, policeReport, files } = req.body || {}
      const created = await prisma.accidentReport.create({
        data: {
          driverId,
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
          truckId: truckId || null,
          location: location || null,
          description: String(description || ''),
          injuries: Boolean(injuries),
          policeReport: Boolean(policeReport),
          files: Array.isArray(files) ? files : [],
        },
      })
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/driver/accidents error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/driver/accidents', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const list = await prisma.accidentReport.findMany({ where: { driverId }, orderBy: { occurredAt: 'desc' } })
      res.json(list)
    } catch (e) {
      console.error('GET /api/driver/accidents error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Fuel receipts
  router.post('/driver/receipts', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const { date, truckId, liters, amount, odometer, fileUrl } = req.body || {}
      const created = await prisma.fuelReceipt.create({
        data: {
          driverId,
          date: date ? new Date(date) : new Date(),
          truckId: truckId || null,
          liters: Number(liters || 0),
          amount: Number(amount || 0),
          odometer: odometer ? Number(odometer) : null,
          fileUrl: fileUrl || null,
        },
      })
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/driver/receipts error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/driver/receipts', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const list = await prisma.fuelReceipt.findMany({ where: { driverId }, orderBy: { date: 'desc' } })
      res.json(list)
    } catch (e) {
      console.error('GET /api/driver/receipts error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Payments
  router.get('/driver/payments', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const list = await prisma.payment.findMany({ where: { driverId }, orderBy: { periodStart: 'desc' } })
      res.json(list)
    } catch (e) {
      console.error('GET /api/driver/payments error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/driver/payslips', ensureAuth, async (req, res) => {
    try {
      const driverId = Number(req.user.uid)
      const payslips = await prisma.payslip.findMany({ where: { payment: { driverId } }, orderBy: { createdAt: 'desc' } })
      res.json(payslips)
    } catch (e) {
      console.error('GET /api/driver/payslips error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // ---------------- Amazing Freight (Admin) ----------------
  // Simple role gate: requires req.user.role === 'admin' (tokens include role)
  function ensureAdmin(req, res, next) {
    if (req.user?.role === 'admin') return next()
    return res.status(403).json({ error: 'Forbidden' })
  }

  router.get('/admin/drivers', ensureAuth, ensureAdmin, async (_req, res) => {
    try {
      const drivers = await prisma.user.findMany({ select: { id: true, email: true, name: true, image: true, role: true }, orderBy: { id: 'asc' } })
      res.json(drivers)
    } catch (e) {
      console.error('GET /api/admin/drivers error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/admin/dockets', ensureAuth, ensureAdmin, async (_req, res) => {
    try {
      const list = await prisma.docket.findMany({ orderBy: { date: 'desc' } })
      res.json(list)
    } catch (e) {
      console.error('GET /api/admin/dockets error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/admin/shifts', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const group = String(req.query.group || 'day')
      const shifts = await prisma.shift.findMany({})
      if (group === 'week') {
        // naive weekly grouping by ISO week number
        function weekKey(d) {
          const dt = new Date(d)
          const target = new Date(dt.valueOf())
          const dayNr = (dt.getDay() + 6) % 7
          target.setDate(target.getDate() - dayNr + 3)
          const jan4 = new Date(target.getFullYear(), 0, 4)
          const dayDiff = (target.valueOf() - jan4.valueOf()) / 86400000
          const week = 1 + Math.floor(dayDiff / 7)
          return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`
        }
        const agg = {}
        for (const s of shifts) {
          const k = weekKey(s.date)
          agg[k] = (agg[k] || 0) + (s.totalHours || 0)
        }
        return res.json({ group: 'week', data: agg })
      }
      // default: by day
      const agg = {}
      for (const s of shifts) {
        const k = new Date(s.date).toISOString().slice(0, 10)
        agg[k] = (agg[k] || 0) + (s.totalHours || 0)
      }
      res.json({ group: 'day', data: agg })
    } catch (e) {
      console.error('GET /api/admin/shifts error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/admin/trucks', ensureAuth, ensureAdmin, async (_req, res) => {
    try {
      const list = await prisma.truck.findMany({ orderBy: { name: 'asc' } })
      res.json(list)
    } catch (e) {
      console.error('GET /api/admin/trucks error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/admin/trucks', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const { rego, name, active = true } = req.body || {}
      const t = await prisma.truck.create({ data: { rego, name, active: Boolean(active) } })
      res.status(201).json(t)
    } catch (e) {
      console.error('POST /api/admin/trucks error:', e)
      if (e?.code === 'P2002') return res.status(409).json({ error: 'Duplicate rego' })
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/products', async (_req, res) => {
    try {
      const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })
      const ownerIds = [...new Set(products.map((p) => p.ownerId).filter((v) => v != null))]
      let ownersMap = new Map()
      let repMap = new Map()
      let avgMap = new Map()
      if (ownerIds.length > 0) {
        const owners = await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, email: true, image: true } })
        ownersMap = new Map(owners.map((u) => [u.id, u]))
        const reps = await prisma.userReputation.findMany({ where: { userId: { in: ownerIds } } })
        repMap = new Map(reps.map((r) => [r.userId, r]))
        try {
          if (prisma?.orderReview?.groupBy) {
            const avgs = await prisma.orderReview.groupBy({ by: ['sellerId'], where: { sellerId: { in: ownerIds } }, _avg: { rating: true } })
            avgMap = new Map(avgs.map((a) => [a.sellerId, a._avg.rating || 0]))
          } else if (prisma?.orderReview?.aggregate) {
            const avgs = await Promise.all(
              ownerIds.map(async (sellerId) => {
                const r = await prisma.orderReview.aggregate({ where: { sellerId }, _avg: { rating: true } })
                return { sellerId, _avg: { rating: r._avg?.rating || 0 } }
              })
            )
            avgMap = new Map(avgs.map((a) => [a.sellerId, a._avg.rating || 0]))
          }
        } catch (_e) {
          // ignore average rating errors; continue without ownerAvgRating
          avgMap = new Map()
        }
      }
      const enriched = products.map((p) => {
        const owner = ownersMap.get(p.ownerId)
        const rep = repMap.get(p.ownerId)
        const ownerName = owner?.name || (owner?.email ? owner.email.split('@')[0] : undefined)
        const ownerImage = owner?.image || null
        const ownerAvgRating = avgMap.get(p.ownerId) || null
        const negCount = rep?.negativeCount || 0
        const ownerRating = compositeRating(ownerAvgRating ?? 5, negCount)
        return { ...p, ownerName, ownerImage, ownerRating, ownerAvgRating, ownerNegativeCount: negCount }
      })
      res.json(enriched)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/products error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })
  
  // Fetch a product by barcode
  router.get('/products/barcode/:code', async (req, res) => {
    try {
      const code = String(req.params.code || '').trim()
      if (!code) return res.status(400).json({ error: 'Missing barcode' })
      const p = await prisma.product.findFirst({ where: { barcode: code } })
      if (!p) return res.status(404).json({ error: 'Not found' })
      res.json(p)
    } catch (e) {
      console.error('GET /api/products/barcode/:code error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  async function fetchServiceAvailability(product, startDate, rangeDays) {
    const start = startOfDay(startDate)
    const span = Number.isFinite(rangeDays) && rangeDays > 0 ? Math.min(rangeDays, 90) : 14
    const end = addDays(start, span)
    const openDays = product.serviceOpenDays?.length ? product.serviceOpenDays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const openTime = product.serviceOpenTime || '09:00'
    const closeTime = product.serviceCloseTime || '17:00'
    const durationMinutes = Math.max(15, product.serviceDurationMinutes || 60)
    const durationMs = durationMinutes * 60 * 1000
    let exampleOpen = combineDateAndTime(start, openTime)
    let exampleClose = combineDateAndTime(start, closeTime)
    if (exampleClose <= exampleOpen) exampleClose = new Date(exampleOpen.getTime() + durationMs)
    const slotsPerDay = Math.max(1, Math.floor((exampleClose.getTime() - exampleOpen.getTime()) / durationMs))
    const existingBookings = await prisma.orderItem.findMany({
      where: {
        productId: product.id,
        appointmentAt: { not: null, gte: start, lt: end },
        appointmentStatus: { notIn: ['cancelled', 'rejected'] },
      },
      select: { id: true, appointmentAt: true },
    })
    const bookingsByDay = new Map()
    for (const booking of existingBookings) {
      if (!booking.appointmentAt) continue
      const at = new Date(booking.appointmentAt)
      const dayKey = at.toISOString().slice(0, 10)
      const slotKeyDate = new Date(at)
      slotKeyDate.setSeconds(0, 0)
      const slotKey = slotKeyDate.getTime()
      if (!bookingsByDay.has(dayKey)) bookingsByDay.set(dayKey, { total: 0, slots: new Map() })
      const entry = bookingsByDay.get(dayKey)
      entry.total += 1
      entry.slots.set(slotKey, (entry.slots.get(slotKey) || 0) + 1)
    }

    const days = []
    for (let offset = 0; offset < span; offset += 1) {
      const dayDate = addDays(start, offset)
      const dayKey = dayDate.toISOString().slice(0, 10)
      const weekday = WEEKDAY_FROM_INDEX[dayDate.getDay()]
      const isOpen = openDays.includes(weekday)
      const booked = bookingsByDay.get(dayKey) || { total: 0, slots: new Map() }
      let dayOpen = combineDateAndTime(dayDate, openTime)
      let dayClose = combineDateAndTime(dayDate, closeTime)
      if (dayClose <= dayOpen) dayClose = new Date(dayOpen.getTime() + durationMs)
      const maxSlots = Math.max(1, Math.floor((dayClose.getTime() - dayOpen.getTime()) / durationMs))
      const dailyCapacity = product.serviceDailyCapacity ?? maxSlots
      const effectiveSlots = Math.min(maxSlots, dailyCapacity)
      const slots = []
      if (isOpen) {
        let slotIndex = 0
        let cursor = new Date(dayOpen)
        while (cursor < dayClose && slotIndex < effectiveSlots) {
          const slotStart = new Date(cursor)
          const slotEnd = new Date(cursor.getTime() + durationMs)
          const slotKey = slotStart.getTime()
          const slotBookings = booked.slots.get(slotKey) || 0
          const available = slotBookings === 0 && booked.total < dailyCapacity
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            available,
            booked: slotBookings,
          })
          cursor = new Date(cursor.getTime() + durationMs)
          slotIndex += 1
        }
      }
      const remaining = Math.max(0, dailyCapacity - (booked.total || 0))
      days.push({
        date: dayKey,
        weekday,
        isOpen,
        remaining,
        capacity: dailyCapacity,
        slots,
      })
  }

  return {
    productId: product.id,
    start: start.toISOString(),
    end: end.toISOString(),
    durationMinutes,
    openTime,
    closeTime,
    openDays,
    days,
  }
}

  const ASSISTANT_INFO_FIELDS = [
    'customer_name',
    'customer_email',
    'customer_phone',
    'address',
    'service_time',
    'product_preference',
    'budget',
  ]

  const AssistantAttachmentSchema = z.object({
    name: z.string().min(1).max(200),
    type: z.string().min(1),
    size: z.number().int().min(1).max(5 * 1024 * 1024),
    data: z.string().min(1),
  })

  const AssistantCartItemInputSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(99).default(1),
    appointmentSlot: z.string().optional(),
    note: z.string().optional(),
  })

  const AssistantRecommendationSchema = z.object({
    productId: z.string().min(1),
    reason: z.string().optional(),
    matchScore: z.number().optional(),
  })

  const AssistantPendingInfoSchema = z.object({
    fields: z.array(z.enum(ASSISTANT_INFO_FIELDS)).min(1),
    reason: z.string().optional(),
  })

  const AssistantAppointmentSchema = z.object({
    productId: z.string().min(1),
    slot: z.string().min(1),
    status: z.string().optional(),
    orderId: z.string().optional(),
    note: z.string().optional(),
  })

  const AssistantOrderSummarySchema = z.object({
    id: z.string().min(1),
    total: z.number(),
    status: z.string().min(1),
    paymentLink: z.string().optional(),
    accessCode: z.string().optional(),
    createdAt: z.string().optional(),
  })

  const SalesAssistantStateSchema = z.object({
    cart: z.array(AssistantCartItemInputSchema).default([]),
    recommendations: z.array(AssistantRecommendationSchema).default([]),
    orders: z.array(AssistantOrderSummarySchema).default([]),
    appointments: z.array(AssistantAppointmentSchema).default([]),
    pendingInfoRequests: z.array(AssistantPendingInfoSchema).default([]),
    metadata: z.record(z.any()).optional(),
  })

  const AssistantConversationMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    actions: z.any().optional(),
    createdAt: z.string().optional(),
  })

  const AssistantCartItemForOrderSchema = AssistantCartItemInputSchema.extend({
    quantity: AssistantCartItemInputSchema.shape.quantity.default(1),
  })

  const SalesAssistantActionSchema = z.discriminatedUnion('type', [
    z.object({
      type: z.literal('recommend_products'),
      products: z.array(AssistantRecommendationSchema).min(1),
    }),
    z.object({
      type: z.literal('add_to_cart'),
      items: z.array(AssistantCartItemInputSchema).min(1),
      replace: z.boolean().optional(),
    }),
    z.object({
      type: z.literal('book_service'),
      productId: z.string().min(1),
      slot: z.string().min(1),
      note: z.string().optional(),
    }),
    z.object({
      type: z.literal('create_order'),
      items: z.array(AssistantCartItemForOrderSchema).min(1).optional(),
      useCart: z.boolean().optional(),
      customerName: z.string().optional(),
      customerEmail: z.string().optional(),
      customerPhone: z.string().optional(),
      address: z.string().optional(),
      note: z.string().optional(),
    }),
    z.object({
      type: z.literal('generate_payment_link'),
      orderId: z.string().optional(),
    }),
    z.object({
      type: z.literal('ask_information'),
      fields: z.array(z.enum(ASSISTANT_INFO_FIELDS)).min(1),
      reason: z.string().optional(),
    }),
    z.object({
      type: z.literal('clear_cart'),
      note: z.string().optional(),
    }),
    z.object({
      type: z.literal('update_metadata'),
      patch: z.record(z.any()),
      scope: z.string().optional(),
    }),
  ])

  const AssistantLLMResponseSchema = z.object({
    reply: z.string(),
    actions: z.array(SalesAssistantActionSchema).default([]),
    suggestions: z.array(z.string()).default([]),
    summary: z.string().optional(),
    sentiment: z.string().optional(),
  })

  function normalizeAssistantResponse(raw) {
    if (!raw || typeof raw !== 'object') return raw
    const normalized = { ...raw }
    normalized.actions = normalizeAssistantActions(raw.actions)
    normalized.suggestions = Array.isArray(raw.suggestions)
      ? raw.suggestions.filter((item) => typeof item === 'string')
      : []
    normalized.reply = typeof raw.reply === 'string' ? raw.reply : String(raw.reply ?? '')
    return normalized
  }

  function normalizeAssistantActions(actions) {
    if (!Array.isArray(actions)) return []
    return actions
      .map((action) => {
        if (!action || typeof action !== 'object') return action
        if (typeof action.action === 'string' && !action.type) {
          const rawType = String(action.action)
          const value = Object.prototype.hasOwnProperty.call(action, rawType) ? action[rawType] : action
          switch (rawType) {
            case 'recommend_products': {
              const products = Array.isArray(value)
                ? value
                : value && typeof value === 'object'
                  ? Array.isArray(value.products)
                    ? value.products
                    : value.productId
                      ? [{ productId: value.productId, reason: value.reason }]
                      : []
                  : []
              return { type: 'recommend_products', products }
            }
            case 'add_to_cart': {
              let itemsArray = []
              if (Array.isArray(value)) {
                itemsArray = value
              } else if (value && typeof value === 'object') {
                const entry = normalizeCartItem(value)
                if (entry) itemsArray = [entry]
              }
              if (!itemsArray.length) return null
              return { type: 'add_to_cart', items: itemsArray, replace: Boolean(value?.replace) }
            }
            case 'book_service': {
              if (value && typeof value === 'object') {
                return {
                  type: 'book_service',
                  productId: value.productId,
                  slot: value.slot ?? value.appointmentSlot,
                  note: value.note,
                }
              }
              return null
            }
            case 'create_order': {
              if (value && typeof value === 'object') {
                return {
                  type: 'create_order',
                  items: Array.isArray(value.items) ? value.items : undefined,
                  useCart: value.useCart,
                  customerName: value.customerName,
                  customerEmail: value.customerEmail,
                  customerPhone: value.customerPhone,
                  address: value.address,
                  note: value.note,
                }
              }
              return null
            }
            case 'generate_payment_link':
              return { type: 'generate_payment_link', orderId: value?.orderId || value }
            case 'ask_information': {
              if (value && typeof value === 'object') {
                return { type: 'ask_information', fields: Array.isArray(value.fields) ? value.fields : [], reason: value.reason }
              }
              if (Array.isArray(value)) {
                return { type: 'ask_information', fields: value, reason: undefined }
              }
              return null
            }
            case 'clear_cart':
              return { type: 'clear_cart', note: value?.note }
            case 'update_metadata': {
              if (value && typeof value === 'object') {
                return { type: 'update_metadata', patch: value.patch || value, scope: value.scope }
              }
              return null
            }
            default:
              return null
          }
        }
        if ('type' in action) return action
        const keys = Object.keys(action).filter((key) => typeof key === 'string')
        if (keys.length !== 1) return action
        const key = keys[0]
        const value = action[key]
        switch (key) {
          case 'recommend_products':
            return {
              type: 'recommend_products',
              products: Array.isArray(value) ? value : [],
            }
          case 'add_to_cart': {
            const payload = Array.isArray(value)
              ? { items: value, replace: false }
              : typeof value === 'object' && value !== null
                ? {
                    items: Array.isArray(value.items) ? value.items : [],
                    replace: Boolean(value.replace),
                  }
                : { items: [] }
            return { type: 'add_to_cart', ...payload }
          }
          case 'book_service': {
            if (Array.isArray(value) && value.length > 0) {
              const entry = value[0]
              return {
                type: 'book_service',
                productId: entry?.productId,
                slot: entry?.slot,
                note: entry?.note,
              }
            }
            if (value && typeof value === 'object') {
              return {
                type: 'book_service',
                productId: value.productId,
                slot: value.slot,
                note: value.note,
              }
            }
            break
          }
          case 'create_order': {
            if (Array.isArray(value) && value.length > 0) {
              return { type: 'create_order', items: value }
            }
            if (value && typeof value === 'object') {
              return {
                type: 'create_order',
                items: Array.isArray(value.items) ? value.items : undefined,
                useCart: value.useCart,
                customerName: value.customerName,
                customerEmail: value.customerEmail,
                customerPhone: value.customerPhone,
                address: value.address,
                note: value.note,
              }
            }
            break
          }
          case 'generate_payment_link': {
            if (value && typeof value === 'object') {
              return { type: 'generate_payment_link', orderId: value.orderId }
            }
            return { type: 'generate_payment_link', orderId: typeof value === 'string' ? value : undefined }
          }
          case 'ask_information': {
            if (Array.isArray(value)) {
              return { type: 'ask_information', fields: value, reason: undefined }
            }
            if (value && typeof value === 'object') {
              return { type: 'ask_information', fields: Array.isArray(value.fields) ? value.fields : [], reason: value.reason }
            }
            break
          }
          case 'clear_cart': {
            if (value && typeof value === 'object') {
              return { type: 'clear_cart', note: value.note }
            }
            return { type: 'clear_cart' }
          }
          case 'update_metadata': {
            if (value && typeof value === 'object') {
              return { type: 'update_metadata', patch: value.patch || value, scope: value.scope }
            }
            return null
          }
          default:
            return action
        }
        return action
      })
      .filter(Boolean)
  }

  function normalizeCartItem(value) {
    if (!value || typeof value !== 'object') return null
    const productId = value.productId ?? value.id
    if (!productId) return null
    const qty = Number(value.quantity)
    const quantity = Number.isFinite(qty) ? Math.max(1, Math.trunc(qty)) : 1
    return {
      productId: String(productId),
      quantity,
      appointmentSlot: value.appointmentSlot ?? value.slot ?? undefined,
      note: value.note ?? undefined,
    }
  }

  function safeParseAssistant(raw) {
    const normalized = normalizeAssistantResponse(raw)
    const parsed = AssistantLLMResponseSchema.safeParse(normalized)
    if (parsed.success) return { data: parsed.data, normalized, warning: null }
    const fallback = {
      reply: typeof normalized?.reply === 'string' ? normalized.reply : '',
      actions: [],
      suggestions: Array.isArray(normalized?.suggestions) ? normalized.suggestions.filter((item) => typeof item === 'string') : [],
      summary: typeof normalized?.summary === 'string' ? normalized.summary : undefined,
      sentiment: typeof normalized?.sentiment === 'string' ? normalized.sentiment : undefined,
    }
    return { data: AssistantLLMResponseSchema.parse(fallback), normalized, warning: parsed.error }
  }

  const SalesAssistantRequestSchema = z.object({
    message: z.string().min(1),
    conversation: z.array(AssistantConversationMessageSchema).max(30).default([]),
    state: SalesAssistantStateSchema.optional(),
    customer: z
      .object({
        id: z.number().int().optional(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      })
      .optional(),
    attachments: z.array(AssistantAttachmentSchema).max(3).optional(),
  })

  function cloneAssistantState(state) {
    if (!state) return { cart: [], recommendations: [], orders: [], appointments: [], pendingInfoRequests: [] }
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(state)
      } catch (e) {
        console.error('structuredClone failed for assistant state:', e)
      }
    }
    return JSON.parse(JSON.stringify(state))
  }

  function randomAssistantAccessCode() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  }

  function buildAssistantPaymentLink(order) {
    if (!order) return null
    if (order.accessCode) return `/marketplace/order/pay?code=${encodeURIComponent(order.accessCode)}`
    return `/marketplace/order/${encodeURIComponent(order.id)}`
  }

  const assistantFallbackCatalog = [
    {
      id: 'demo-anc-headphones',
      slug: 'demo-anc-headphones',
      title: 'Wireless ANC Headphones',
      price: 229,
      type: 'goods',
      seller: 'Nova Audio',
      rating: 4.8,
      image: imageForServer('modern headphones product', 640, 640),
      description: 'Immersive over-ear wireless headphones with adaptive noise cancelling and 28-hour battery life.',
      stockCount: 38,
      tags: ['audio', 'electronics'],
    },
    {
      id: 'demo-smartphone-128',
      slug: 'demo-smartphone-128',
      title: 'Smartphone 128GB',
      price: 699,
      type: 'goods',
      seller: 'Metro Gadgets',
      rating: 4.7,
      image: imageForServer('modern smartphone product', 640, 640),
      description: '6.7" OLED display, triple camera system, and 128GB storage. Ships unlocked with 24-month warranty.',
      stockCount: 22,
      tags: ['electronics', 'mobile'],
    },
    {
      id: 'demo-cleaning-2h',
      slug: 'demo-cleaning-2h',
      title: 'Apartment Cleaning (2h)',
      price: 89,
      type: 'service',
      seller: 'Sparkle Pro',
      rating: 4.9,
      image: imageForServer('apartment cleaning service', 640, 640),
      description: 'Two-hour professional clean covering kitchen, bathroom, and living spaces. Eco-friendly supplies included.',
      service: {
        openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        openTime: '09:00',
        closeTime: '18:00',
        durationMinutes: 120,
        dailyCapacity: 4,
        availability: {
          days: ['2025-01-10T09:00:00Z', '2025-01-10T11:30:00Z', '2025-01-11T09:00:00Z'],
        },
      },
      tags: ['home', 'service'],
    },
    {
      id: 'demo-portrait-photo',
      slug: 'demo-portrait-photo',
      title: 'Portrait Photography (1h)',
      price: 150,
      type: 'service',
      seller: 'LensCraft',
      rating: 4.8,
      image: imageForServer('portrait photography studio', 640, 640),
      description: 'Studio portrait session with professional lighting, 10 retouched images delivered within 72 hours.',
      service: {
        openDays: ['wednesday', 'thursday', 'friday', 'saturday'],
        openTime: '10:00',
        closeTime: '17:00',
        durationMinutes: 60,
        dailyCapacity: 5,
        availability: {
          days: ['2025-01-11T10:00:00Z', '2025-01-11T12:00:00Z', '2025-01-12T14:00:00Z'],
        },
      },
      tags: ['creative', 'service'],
    },
  ]

  async function loadAssistantCatalog({ limit = 25 } = {}) {
    const products = await prisma.product.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { category: { select: { name: true } } },
    })
    if (!products.length) {
      const map = new Map()
      for (const item of assistantFallbackCatalog) {
        map.set(item.id, item)
      }
      return { list: assistantFallbackCatalog, map }
    }

    const ownerIds = [...new Set(products.map((p) => p.ownerId).filter((v) => v != null))]
    let ownersMap = new Map()
    let repMap = new Map()
    let avgMap = new Map()
    if (ownerIds.length > 0) {
      const owners = await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, email: true } })
      ownersMap = new Map(owners.map((u) => [u.id, u]))
      const reps = await prisma.userReputation.findMany({ where: { userId: { in: ownerIds } } })
      repMap = new Map(reps.map((r) => [r.userId, r]))
      try {
        if (prisma?.orderReview?.groupBy) {
          const avgs = await prisma.orderReview.groupBy({ by: ['sellerId'], where: { sellerId: { in: ownerIds } }, _avg: { rating: true } })
          avgMap = new Map(avgs.map((a) => [a.sellerId, a._avg.rating || 0]))
        }
      } catch {}
    }

    const enriched = []
    for (const product of products) {
      const owner = ownersMap.get(product.ownerId)
      const rep = repMap.get(product.ownerId)
      const ownerAvgRating = avgMap.get(product.ownerId) || null
      const negCount = rep?.negativeCount || 0
      const ownerRating = compositeRating(ownerAvgRating ?? 5, negCount)
      const base = {
        id: product.id,
        slug: product.slug,
        title: product.title,
        price: product.price,
        type: product.type,
        sellerId: product.ownerId,
        seller: owner?.name || (owner?.email ? owner.email.split('@')[0] : product.seller || 'Verified seller'),
        rating: product.rating ?? ownerRating ?? 4.7,
        image: product.img || imageForServer(product.title, 640, 640),
        description: product.description || '',
        stockCount: product.stockCount,
        category: product.category?.name || null,
        tags: product.category?.name ? [product.category.name] : [],
      }
      if (product.type === 'service') {
        try {
          const availability = await fetchServiceAvailability(product, new Date(), 14)
          base.service = {
            openDays: availability.openDays,
            openTime: availability.openTime,
            closeTime: availability.closeTime,
            durationMinutes: availability.durationMinutes,
            dailyCapacity: product.serviceDailyCapacity ?? null,
            availability: (availability.days || [])
              .filter((d) => d.isOpen)
              .flatMap((d) => (d.slots || []).filter((s) => s.available).slice(0, 2))
              .slice(0, 6)
              .map((slot) => slot.start),
          }
        } catch (e) {
          base.service = {
            openDays: product.serviceOpenDays || [],
            openTime: product.serviceOpenTime || null,
            closeTime: product.serviceCloseTime || null,
            durationMinutes: product.serviceDurationMinutes || null,
            dailyCapacity: product.serviceDailyCapacity || null,
            availability: [],
          }
        }
      }
      enriched.push(base)
    }

    const map = new Map()
    for (const item of enriched) map.set(item.id, item)
    return { list: enriched, map }
  }

  async function createAssistantOrders({
    items,
    buyerId,
    customerName,
    customerEmail,
    customerPhone,
    address,
  }) {
    if (!Array.isArray(items) || !items.length) throw new Error('No items to create an order with')
    const productIds = [...new Set(items.map((item) => item.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        ownerId: true,
        title: true,
        price: true,
        type: true,
        stockCount: true,
        serviceOpenDays: true,
        serviceOpenTime: true,
        serviceCloseTime: true,
        serviceDurationMinutes: true,
        serviceDailyCapacity: true,
      },
    })
    const productById = new Map(products.map((p) => [p.id, p]))
    for (const productId of productIds) {
      if (!productById.has(productId)) throw new Error(`Product ${productId} is no longer available`)
    }

    const normalizedItems = []
    const goodsAdjustments = new Map()
    const pendingServiceSlots = new Set()

    for (const item of items) {
      const product = productById.get(item.productId)
      if (!product) throw new Error(`Product ${item.productId} is unavailable`)
      const quantity = Math.max(1, Number(item.quantity || 1))
      if (product.type === 'goods') {
        const stock = Number(product.stockCount ?? 0)
        if (quantity > stock) throw new Error(`"${product.title}" only has ${stock} in stock.`)
        goodsAdjustments.set(product.id, (goodsAdjustments.get(product.id) || 0) + quantity)
        normalizedItems.push({
          productId: product.id,
          quantity,
          price: Number(product.price) || 0,
          sellerId: product.ownerId ?? null,
          title: product.title,
          type: 'goods',
        })
      } else {
        const slotString = item.appointmentSlot || item.meta || item.note
        if (!slotString) throw new Error(`Select a valid appointment time for "${product.title}".`)
        const slot = new Date(slotString)
        if (Number.isNaN(slot.getTime())) throw new Error(`Invalid appointment time for "${product.title}".`)
        slot.setSeconds(0, 0)
        const slotKey = `${product.id}:${slot.getTime()}`
        if (pendingServiceSlots.has(slotKey)) throw new Error(`Duplicate appointment time selected for "${product.title}".`)
        pendingServiceSlots.add(slotKey)
        const availability = await fetchServiceAvailability(product, slot, 1)
        const slotAvailable = (availability.days || []).some((day) =>
          (day.slots || []).some((entry) => entry.available && new Date(entry.start).getTime() === slot.getTime())
        )
        if (!slotAvailable) throw new Error(`That time for "${product.title}" was just taken. Please choose a different slot.`)
        normalizedItems.push({
          productId: product.id,
          quantity: 1,
          price: Number(product.price) || 0,
          sellerId: product.ownerId ?? null,
          title: product.title,
          type: 'service',
          appointmentAt: slot,
        })
      }
    }

    const groups = new Map()
    for (const item of normalizedItems) {
      const key = item.sellerId == null ? 'null' : String(item.sellerId)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    }

    const createdOrders = []
    for (const [key, groupItems] of groups) {
      const sellerId = key === 'null' ? null : Number(key)
      const total = groupItems.reduce((sum, entry) => sum + Number(entry.price || 0) * Number(entry.quantity || 1), 0)
      const order = await prisma.order.create({
        data: {
          buyerId: Number.isFinite(Number(buyerId)) ? Number(buyerId) : null,
          sellerId,
          total: Math.max(0, Math.round(total)),
          status: 'pending',
          customerName: customerName || null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          address: address || null,
          accessCode: randomAssistantAccessCode(),
          items: {
            create: groupItems.map((entry) => ({
              productId: entry.productId,
              title: entry.title,
              price: Number(entry.price) || 0,
              quantity: Number(entry.quantity) || 1,
              appointmentAt: entry.type === 'service' && entry.appointmentAt ? new Date(entry.appointmentAt) : null,
              appointmentStatus: entry.type === 'service' ? 'requested' : null,
            })),
          },
        },
        include: { items: true },
      })
      createdOrders.push(order)
    }

    for (const [productId, decrement] of goodsAdjustments) {
      await prisma.product.update({ where: { id: productId }, data: { stockCount: { decrement } } })
    }

    return createdOrders
  }

  async function applyAssistantActions({
    actions,
    state,
    catalogMap,
    customer,
    buyerId,
  }) {
    const nextState = cloneAssistantState(state || {})
    if (!Array.isArray(nextState.cart)) nextState.cart = []
    if (!Array.isArray(nextState.recommendations)) nextState.recommendations = []
    if (!Array.isArray(nextState.orders)) nextState.orders = []
    if (!Array.isArray(nextState.appointments)) nextState.appointments = []
    if (!Array.isArray(nextState.pendingInfoRequests)) nextState.pendingInfoRequests = []

    const catalogEntries = Array.from(catalogMap.values())
    const catalogSlugMap = new Map()
    const catalogIdLowerMap = new Map()
    for (const item of catalogEntries) {
      if (item?.slug) catalogSlugMap.set(String(item.slug).toLowerCase(), item)
      if (item?.id) catalogIdLowerMap.set(String(item.id).toLowerCase(), item)
    }

    const productCache = new Map()

    function registerCatalogProduct(item) {
      if (!item || !item.id) return item
      if (!catalogMap.has(item.id)) catalogMap.set(item.id, item)
      catalogIdLowerMap.set(String(item.id).toLowerCase(), item)
      if (item.slug) catalogSlugMap.set(String(item.slug).toLowerCase(), item)
      return item
    }

    async function resolveCatalogProduct(identifier) {
      if (identifier == null) return null
      const raw = String(identifier).trim()
      if (!raw) return null
      const direct = catalogMap.get(raw)
      if (direct) return direct
      const lower = raw.toLowerCase()
      if (catalogSlugMap.has(lower)) return catalogSlugMap.get(lower)
      if (catalogIdLowerMap.has(lower)) return catalogIdLowerMap.get(lower)
      if (productCache.has(lower)) return productCache.get(lower)

      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { id: raw },
            { slug: raw },
            { id: lower },
            { slug: lower },
          ],
        },
        select: {
          id: true,
          slug: true,
          title: true,
          price: true,
          type: true,
          img: true,
          description: true,
          stockCount: true,
          seller: true,
          ownerId: true,
          rating: true,
        },
      })

      if (!product) {
        productCache.set(lower, null)
        return null
      }

      const normalized = {
        id: product.id,
        slug: product.slug,
        title: product.title,
        price: product.price,
        type: product.type,
        sellerId: product.ownerId ?? null,
        seller: product.seller || 'Marketplace seller',
        rating: product.rating ?? null,
        image: product.img || imageForServer(product.title, 640, 640),
        description: product.description || '',
        stockCount: product.stockCount,
      }

      registerCatalogProduct(normalized)
      productCache.set(lower, normalized)
      productCache.set(product.id.toLowerCase(), normalized)
      if (product.slug) productCache.set(product.slug.toLowerCase(), normalized)
      return normalized
    }

    const results = []
    const createdOrders = []

    for (const action of actions) {
      try {
        if (action.type === 'recommend_products') {
          const resolved = []
          for (const item of action.products) {
            const product = await resolveCatalogProduct(item.productId)
            if (!product) continue
            resolved.push({
              ...item,
              productId: product.id,
              title: product.title,
              price: product.price,
              type: product.type,
              image: product.image,
              slug: product.slug,
            })
          }
          if (resolved.length) {
            const existingIds = new Set(nextState.recommendations.map((r) => r.productId))
            for (const rec of resolved) {
              if (!existingIds.has(rec.productId)) {
                nextState.recommendations.push({ productId: rec.productId, reason: rec.reason, matchScore: rec.matchScore })
                existingIds.add(rec.productId)
              }
            }
          }
          results.push({ ...action, status: 'applied', products: resolved })
        } else if (action.type === 'add_to_cart') {
          if (!Array.isArray(action.items) || action.items.length === 0) {
            throw new Error('No cart items supplied')
          }
          const payload = []
          for (const entry of action.items) {
            const product = await resolveCatalogProduct(entry.productId)
            if (!product) throw new Error(`Product ${entry.productId} could not be found`)
            const quantity = Math.max(1, Number(entry.quantity || 1))
            payload.push({
              productId: product.id,
              quantity,
              appointmentSlot: entry.appointmentSlot,
              note: entry.note,
              title: product.title,
              price: product.price,
              type: product.type,
              slug: product.slug,
            })
          }
          if (Number.isFinite(buyerId)) {
            let cart = await prisma.cart.findFirst({ where: { userId: Number(buyerId) } })
            if (!cart) {
              cart = await prisma.cart.create({ data: { userId: Number(buyerId) } })
            }
            for (const entry of payload) {
              const metaObject = entry.appointmentSlot || entry.note ? { appointmentSlot: entry.appointmentSlot, note: entry.note } : null
              const metaString = metaObject ? JSON.stringify(metaObject) : null
              const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: entry.productId } })
              if (existing) {
                await prisma.cartItem.update({
                  where: { id: existing.id },
                  data: {
                    quantity: Math.min(99, (existing.quantity || 0) + entry.quantity),
                    meta: metaString ?? existing.meta,
                  },
                })
              } else {
                await prisma.cartItem.create({
                  data: {
                    cartId: cart.id,
                    productId: entry.productId,
                    quantity: entry.quantity,
                    meta: metaString,
                  },
                })
              }
            }
          }
          if (action.replace) {
            nextState.cart = payload.map((item) => ({ productId: item.productId, quantity: item.quantity, appointmentSlot: item.appointmentSlot, note: item.note }))
          } else {
            const byId = new Map(nextState.cart.map((item) => [item.productId, item]))
            for (const entry of payload) {
              if (byId.has(entry.productId)) {
                const existing = byId.get(entry.productId)
                existing.quantity = Math.min(99, Math.max(1, Number(existing.quantity || 1) + Number(entry.quantity || 1)))
                if (entry.appointmentSlot) existing.appointmentSlot = entry.appointmentSlot
                if (entry.note) existing.note = entry.note
              } else {
                const item = { productId: entry.productId, quantity: entry.quantity, appointmentSlot: entry.appointmentSlot, note: entry.note }
                nextState.cart.push(item)
                byId.set(entry.productId, item)
              }
            }
          }
          results.push({ ...action, status: 'applied', items: payload })
        } else if (action.type === 'book_service') {
          const product = await resolveCatalogProduct(action.productId)
          if (!product) throw new Error(`Service ${action.productId} not found`)
          const slot = new Date(action.slot)
          if (Number.isNaN(slot.getTime())) throw new Error('Invalid appointment time provided')
          const dbProduct = await prisma.product.findUnique({ where: { id: product.id } })
          if (!dbProduct) throw new Error('Selected service is not available in the live catalogue')
          const availability = await fetchServiceAvailability(dbProduct, slot, 1)
          const slotAvailable = (availability?.days || []).some((day) =>
            (day.slots || []).some((entry) => entry.available && new Date(entry.start).getTime() === slot.getTime())
          )
          if (!slotAvailable) throw new Error('Selected appointment is no longer available')
          nextState.appointments.push({
            productId: product.id,
            slot: slot.toISOString(),
            status: 'requested',
            note: action.note,
          })
          nextState.cart.push({ productId: product.id, quantity: 1, appointmentSlot: slot.toISOString() })
          results.push({ ...action, productId: product.id, status: 'applied', slot: slot.toISOString(), title: product.title })
        } else if (action.type === 'create_order') {
          const sourceItems = action.useCart || !action.items?.length ? nextState.cart : action.items
          if (!sourceItems || !sourceItems.length) throw new Error('No items available to create an order')
          const normalized = []
          for (const item of sourceItems) {
            const product = await resolveCatalogProduct(item.productId)
            if (!product) throw new Error(`Product ${item.productId} is no longer available`)
            normalized.push({
              productId: product.id,
              quantity: Math.max(1, Number(item.quantity || 1)),
              appointmentSlot: item.appointmentSlot,
              note: item.note,
            })
          }
          const orders = await createAssistantOrders({
            items: normalized,
            buyerId,
            customerName: action.customerName || customer?.name || null,
            customerEmail: action.customerEmail || customer?.email || null,
            customerPhone: action.customerPhone || customer?.phone || null,
            address: action.address || null,
          })
          createdOrders.push(...orders)
          for (const order of orders) {
            nextState.orders.push({
              id: order.id,
              total: order.total,
              status: order.status,
              paymentLink: buildAssistantPaymentLink(order),
              accessCode: order.accessCode || null,
              createdAt: order.createdAt?.toISOString?.() || new Date().toISOString(),
            })
          }
          nextState.cart = []
          nextState.pendingInfoRequests = []
          results.push({ ...action, status: 'applied', orders: orders.map((o) => ({ id: o.id, total: o.total })) })
        } else if (action.type === 'generate_payment_link') {
          const orderId = action.orderId || (nextState.orders[nextState.orders.length - 1]?.id ?? null)
          if (!orderId) throw new Error('No order to generate a payment link for')
          let orderSummary = nextState.orders.find((o) => o.id === orderId)
          if (!orderSummary) {
            const order = await prisma.order.findUnique({ where: { id: orderId } })
            if (!order) throw new Error('Order not found')
            orderSummary = {
              id: order.id,
              total: order.total,
              status: order.status,
              paymentLink: buildAssistantPaymentLink(order),
              accessCode: order.accessCode || null,
              createdAt: order.createdAt?.toISOString?.() || new Date().toISOString(),
            }
            nextState.orders.push(orderSummary)
          }
          if (!orderSummary.paymentLink) {
            const order = await prisma.order.findUnique({ where: { id: orderSummary.id } })
            if (order?.accessCode) orderSummary.paymentLink = buildAssistantPaymentLink(order)
          }
          results.push({ ...action, status: 'applied', paymentLink: orderSummary.paymentLink, orderId: orderSummary.id })
        } else if (action.type === 'ask_information') {
          nextState.pendingInfoRequests.push({ fields: action.fields, reason: action.reason })
          results.push({ ...action, status: 'applied' })
        } else if (action.type === 'clear_cart') {
          nextState.cart = []
          results.push({ ...action, status: 'applied' })
        } else if (action.type === 'update_metadata') {
          nextState.metadata = { ...(nextState.metadata || {}), ...action.patch }
          results.push({ ...action, status: 'applied' })
        } else {
          results.push({ ...action, status: 'ignored' })
        }
      } catch (err) {
        results.push({ ...action, status: 'error', error: err?.message || 'Unknown error' })
      }
    }

    return { state: nextState, results, createdOrders }
  }

  router.post('/assistant/chat', async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return res.status(503).json({ error: 'Assistant not configured. Provide OPENAI_API_KEY.' })

      const parseResult = SalesAssistantRequestSchema.safeParse(req.body || {})
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid assistant payload', detail: parseResult.error.flatten() })
      }

      const { message, conversation, state, customer, attachments = [] } = parseResult.data
      const { list: catalog, map: catalogMap } = await loadAssistantCatalog({ limit: 20 })
      const buyerId = Number.isFinite(Number(req.user?.uid)) ? Number(req.user.uid) : null
      const sanitizedState = cloneAssistantState(state || {})

      const attachmentSummaries = []
      const attachmentImages = []

      for (const attachment of attachments) {
        try {
          const mime = String(attachment.type || '').toLowerCase()
          if (!mime) continue
          if (mime.startsWith('image/')) {
            const dataUrl = attachment.data.startsWith('data:')
              ? attachment.data
              : `data:${mime};base64,${attachment.data}`
            attachmentImages.push({ name: attachment.name, dataUrl })
            attachmentSummaries.push(`${attachment.name} (image, ${(attachment.size / 1024).toFixed(1)} kB)`)
          } else if (mime === 'application/pdf') {
            const buffer = Buffer.from(attachment.data, 'base64')
            const parsed = await pdfParse(buffer)
            const text = (parsed?.text || '').replace(/\s+/g, ' ').trim()
            const truncated = text.slice(0, 4000)
            attachmentSummaries.push(
              `${attachment.name} (PDF extract): ${truncated || 'No textual content detected.'}`,
            )
          } else {
            attachmentSummaries.push(
              `${attachment.name} (${mime}) provided. Describe its key points in your reply if relevant.`,
            )
          }
        } catch (err) {
          attachmentSummaries.push(`${attachment.name}: Failed to process (${err?.message || 'unknown error'})`)
        }
      }

      const systemPrompt = `You are Hedgetech's AI commerce assistant helping buyers discover products and services, collect missing details, and trigger marketplace actions.
Respond with valid JSON only. Never include markdown or plain text outside JSON. Stay friendly, concise, and human — imagine a knowledgeable retail concierge in Australia.

JSON response schema:
{
  "reply": string; // conversational response for the buyer in Australian English
  "actions": Action[]; // see action specs below
  "suggestions": string[]; // optional follow-up quick replies (≤4, succinct)
}

Action types you can request:
- recommend_products: suggest SKUs from the provided catalog. Include productId and optional reason/matchScore.
- add_to_cart: stage one or more products with quantity and optional appointmentSlot for services. Always use catalog productId and include quantity.
- book_service: reserve a service slot (requires slot ISO timestamp from availability window).
- create_order: when buyer is ready. Supply customer details (if known) and items or set useCart true to consume current cart. Provide productId and quantity per item.
- generate_payment_link: provide when an order exists so the buyer can complete payment.
- ask_information: request mandatory details (e.g., customer_email, address, service_time) you are missing.
- clear_cart: remove staged items when buyer changes direction.
- update_metadata: store facts about buyer preferences to guide future recommendations.

Rules:
- Only recommend or sell items present in "catalog". Use productId exactly as provided.
- If info is missing to proceed (like email, service time), emit ask_information before create_order.
- Services require appointmentSlot aligned with availability. Use ISO strings from availability data.
- When you create an order for goods that need shipping, make sure an address is collected.
- When payment is outstanding after order creation, request generate_payment_link so the customer can pay.
- Keep reply warm, factual, and helpful. Reference seller or service details when useful.
- Respect prior conversation context supplied.
- Use attachment notes and images to inform your reply and actions.`

      const historyMessages = (conversation || [])
        .slice(-8)
        .map((entry) => ({
          role: entry.role,
          content: String(entry.content || '').slice(0, 2000),
        }))

      const assistantContext = {
        customer: customer || null,
        state: {
          cart: sanitizedState.cart || [],
          recommendations: sanitizedState.recommendations || [],
          orders: sanitizedState.orders || [],
          appointments: sanitizedState.appointments || [],
          pendingInfoRequests: sanitizedState.pendingInfoRequests || [],
        },
        catalog,
        attachments: attachments.map((file) => ({ name: file.name, type: file.type, size: file.size })),
      }

      const userContent = [
        'Customer message:',
        message,
        '',
        'Assistant context JSON:',
        JSON.stringify(assistantContext, null, 2),
        attachmentSummaries.length ? '' : null,
        attachmentSummaries.length ? 'Attachment notes:' : null,
        ...attachmentSummaries,
      ].filter(Boolean).join('\n')

      const userContentParts = [
        { type: 'input_text', text: userContent },
        ...attachmentImages.map((image) => ({ type: 'input_image', image_url: { url: image.dataUrl } })),
      ]

      const body = {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: userContentParts },
        ],
      }

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!resp.ok) {
        const detail = await resp.text().catch(() => '')
        return res.status(502).json({ error: 'OpenAI error', detail })
      }

      const data = await resp.json()
      const content = data?.choices?.[0]?.message?.content
      if (!content) return res.status(502).json({ error: 'Assistant returned no content' })

      let raw
      try {
        raw = JSON.parse(content)
      } catch (e) {
        return res.status(502).json({ error: 'Assistant produced invalid JSON', detail: e?.message || 'parse error', raw: content })
      }

      const { data: assistantData, warning } = safeParseAssistant(raw)
      if (warning) console.warn('Assistant response normalized with warnings')

      const { state: nextState, results, createdOrders } = await applyAssistantActions({
        actions: assistantData.actions || [],
        state: sanitizedState,
        catalogMap,
        customer,
        buyerId,
      })

      const assistantMessage = {
        id: `assistant-${randomAssistantAccessCode().slice(0, 8)}`,
        role: 'assistant',
        content: assistantData.reply,
        actions: results,
        suggestions: assistantData.suggestions || [],
        createdAt: new Date().toISOString(),
      }

      res.json({
        message: assistantMessage,
        state: nextState,
        usage: data?.usage || null,
        raw: assistantData,
        createdOrders: (createdOrders || []).map((order) => ({
          id: order.id,
          total: order.total,
          status: order.status,
          paymentLink: buildAssistantPaymentLink(order),
          accessCode: order.accessCode || null,
        })),
      })
    } catch (e) {
      console.error('POST /api/assistant/chat error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/products/:id/availability', async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing product id' })
      const product = await prisma.product.findUnique({ where: { id } })
      if (!product) return res.status(404).json({ error: 'Product not found' })
      if (product.type !== 'service') return res.status(400).json({ error: 'Availability only applies to services' })
      const startParam = req.query.start ? new Date(String(req.query.start)) : new Date()
      if (Number.isNaN(startParam.getTime())) return res.status(400).json({ error: 'Invalid start date' })
      const windowParam = req.query.days ? Number(req.query.days) : undefined
      const availability = await fetchServiceAvailability(product, startParam, windowParam)
      res.json(availability)
    } catch (e) {
      console.error('GET /api/products/:id/availability error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/products', ensureAuth, async (req, res) => {
    try {
      let {
        images,
        description,
        barcode,
        stockCount,
        serviceOpenDays,
        serviceDurationMinutes,
        serviceOpenTime,
        serviceCloseTime,
        serviceDailyCapacity,
        ...rest
      } = req.body || {}
      if (typeof images === 'string') {
        images = images
          .split(/\n|,/) // split on newlines or commas
          .map((s) => String(s).trim())
          .filter(Boolean)
      }
      if (!Array.isArray(images)) images = undefined
      const normalizedDescription = typeof description === 'string' ? description.trim() || null : description ?? null
      const normalizedBarcode = typeof barcode === 'string' ? barcode.trim() || null : undefined
      const data = {
        ...rest,
        stockCount: parseIntOrDefault(stockCount, 0, { min: 0 }),
        serviceOpenDays: normalizeOpenDays(serviceOpenDays),
        serviceDurationMinutes: parseIntOrNull(serviceDurationMinutes, { min: 0 }),
        serviceDailyCapacity: parseIntOrNull(serviceDailyCapacity, { min: 0 }),
        serviceOpenTime: normalizeTimeString(serviceOpenTime),
        serviceCloseTime: normalizeTimeString(serviceCloseTime),
        description: normalizedDescription,
        images,
        barcode: normalizedBarcode === undefined ? undefined : normalizedBarcode,
        ownerId: req.user.uid,
      }
      const created = await prisma.product.create({ data })
      res.status(201).json(created)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/products error:', e)
      if (e?.code === 'P2002') {
        return res.status(409).json({ error: 'Duplicate barcode for this seller' })
      }
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/products', ensureAuth, async (req, res) => {
    try {
      const {
        id,
        images,
        description,
        barcode,
        stockCount,
        serviceOpenDays,
        serviceDurationMinutes,
        serviceOpenTime,
        serviceCloseTime,
        serviceDailyCapacity,
        ...rest
      } = req.body || {}
      if (!id) return res.status(400).send('Missing id')
      let imagesArr = images
      if (typeof images === 'string') {
        imagesArr = images
          .split(/\n|,/) // split on newlines or commas
          .map((s) => String(s).trim())
          .filter(Boolean)
      }
      const normalizedDescription =
        description === undefined ? undefined : typeof description === 'string' ? description.trim() || null : description
      const normalizedBarcode =
        barcode === undefined ? undefined : typeof barcode === 'string' ? barcode.trim() || null : barcode
      const data = {
        ...rest,
        description: normalizedDescription,
        barcode: normalizedBarcode,
        images: Array.isArray(imagesArr) ? imagesArr : undefined,
        stockCount: stockCount === undefined ? undefined : parseIntOrDefault(stockCount, 0, { min: 0 }),
        serviceOpenDays:
          serviceOpenDays === undefined ? undefined : normalizeOpenDays(serviceOpenDays),
        serviceDurationMinutes:
          serviceDurationMinutes === undefined
            ? undefined
            : parseIntOrNull(serviceDurationMinutes, { min: 0 }),
        serviceDailyCapacity:
          serviceDailyCapacity === undefined ? undefined : parseIntOrNull(serviceDailyCapacity, { min: 0 }),
        serviceOpenTime:
          serviceOpenTime === undefined ? undefined : normalizeTimeString(serviceOpenTime),
        serviceCloseTime:
          serviceCloseTime === undefined ? undefined : normalizeTimeString(serviceCloseTime),
      }
      let updated
      try {
        updated = await prisma.product.update({ where: { id }, data })
      } catch (e) {
        if (e?.code === 'P2002') return res.status(409).json({ error: 'Duplicate barcode for this seller' })
        throw e
      }
      res.json(updated)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('PUT /api/products error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/products', ensureAuth, async (req, res) => {
    try {
      const { id } = req.body || {}
      if (!id) return res.status(400).send('Missing id')
      await prisma.product.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('DELETE /api/products error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Categories
  router.get('/categories', async (_req, res) => {
    try {
      const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } })
      res.json(cats)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/categories error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/categories', ensureAuth, async (req, res) => {
    try {
      const created = await prisma.category.create({ data: req.body })
      res.status(201).json(created)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/categories error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/categories', ensureAuth, async (req, res) => {
    try {
      const { id, ...patch } = req.body
      if (!id) return res.status(400).send('Missing id')
      const updated = await prisma.category.update({ where: { id }, data: patch })
      res.json(updated)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('PUT /api/categories error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/categories', ensureAuth, async (req, res) => {
    try {
      const { id } = req.body || {}
      if (!id) return res.status(400).send('Missing id')
      await prisma.category.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('DELETE /api/categories error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Announcements -----------------------------------------------------------
  router.get('/announcements', async (req, res) => {
    try {
      const audiences = ['all', 'buyers', 'sellers', 'drivers', 'admins']
      const requested = String(req.query.audience || '').toLowerCase()
      const filterAudience = audiences.includes(requested) ? requested : null
      const now = new Date()
      const baseWhere = {
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      }
      if (filterAudience && filterAudience !== 'all') {
        baseWhere.AND.push({ audience: { in: ['all', filterAudience] } })
      }
      const list = await prisma.announcement.findMany({
        where: baseWhere,
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
        take: 50,
        include: { author: { select: { id: true, name: true, email: true } } },
      })
      res.json(list)
    } catch (e) {
      console.error('GET /api/announcements error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/admin/announcements', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const { title, body, audience = 'all', pinned = false, startAt, endAt } = req.body || {}
      if (!title || !body) return res.status(400).json({ error: 'Title and body are required' })
      const normalizedAudience = ['all', 'buyers', 'sellers', 'drivers', 'admins'].includes(String(audience)) ? String(audience) : 'all'
      const startDate = startAt ? new Date(startAt) : null
      const endDate = endAt ? new Date(endAt) : null
      if (startDate && Number.isNaN(startDate.getTime())) return res.status(400).json({ error: 'Invalid startAt' })
      if (endDate && Number.isNaN(endDate.getTime())) return res.status(400).json({ error: 'Invalid endAt' })
      const created = await prisma.announcement.create({
        data: {
          title: String(title).trim(),
          body: String(body),
          audience: normalizedAudience,
          pinned: Boolean(pinned),
          startAt: startDate,
          endAt: endDate,
          authorId: Number.isFinite(Number(req.user?.uid)) ? Number(req.user.uid) : null,
        },
      })
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/admin/announcements error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/admin/announcements/:id', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing id' })
      const { title, body, audience, pinned, startAt, endAt } = req.body || {}
      const patch = {}
      if (title !== undefined) patch.title = String(title).trim()
      if (body !== undefined) patch.body = String(body)
      if (audience !== undefined && ['all', 'buyers', 'sellers', 'drivers', 'admins'].includes(String(audience))) patch.audience = String(audience)
      if (pinned !== undefined) patch.pinned = Boolean(pinned)
      if (startAt !== undefined) {
        const startDate = startAt ? new Date(startAt) : null
        if (startDate && Number.isNaN(startDate.getTime())) return res.status(400).json({ error: 'Invalid startAt' })
        patch.startAt = startDate
      }
      if (endAt !== undefined) {
        const endDate = endAt ? new Date(endAt) : null
        if (endDate && Number.isNaN(endDate.getTime())) return res.status(400).json({ error: 'Invalid endAt' })
        patch.endAt = endDate
      }
      const updated = await prisma.announcement.update({ where: { id }, data: patch })
      res.json(updated)
    } catch (e) {
      console.error('PUT /api/admin/announcements/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/admin/announcements/:id', ensureAuth, ensureAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing id' })
      await prisma.announcement.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      console.error('DELETE /api/admin/announcements/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Support tickets ---------------------------------------------------------
  function canViewTicket(user, ticket) {
    if (!user || !ticket) return false
    if (user.role === 'admin') return true
    const uid = Number(user.uid)
    if (!Number.isFinite(uid)) return false
    if (ticket.requesterId === uid) return true
    if (ticket.sellerId && ticket.sellerId === uid) return true
    return false
  }

  const ticketInclude = {
    requester: { select: { id: true, name: true, email: true, image: true } },
    seller: { select: { id: true, name: true, email: true, image: true } },
    order: { select: { id: true, status: true } },
    orderItem: { select: { id: true, title: true } },
    messages: {
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, email: true, image: true } } },
    },
  }

  router.get('/support/tickets', ensureAuth, async (req, res) => {
    try {
      const uid = Number(req.user.uid)
      const role = req.user.role
      const where = role === 'admin'
        ? {}
        : { OR: [{ requesterId: uid }, { sellerId: uid }] }
      const list = await prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: ticketInclude,
      })
      res.json(list)
    } catch (e) {
      console.error('GET /api/support/tickets error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/support/tickets/:id', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing ticket id' })
      const ticket = await prisma.supportTicket.findUnique({ where: { id }, include: ticketInclude })
      if (!ticket) return res.status(404).json({ error: 'Not found' })
      if (!canViewTicket(req.user, ticket)) return res.status(403).json({ error: 'Forbidden' })
      res.json(ticket)
    } catch (e) {
      console.error('GET /api/support/tickets/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/support/tickets', ensureAuth, async (req, res) => {
    try {
      const uid = Number(req.user.uid)
      if (!Number.isFinite(uid)) return res.status(401).json({ error: 'Unauthorized' })
      const { subject, body, type = 'general', orderId, orderItemId, priority = 'normal' } = req.body || {}
      if (!subject) return res.status(400).json({ error: 'Subject required' })
      if (!body) return res.status(400).json({ error: 'Message required' })
      let sellerId = null
      let order = null
      if (orderId) {
        order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
        if (order) {
          sellerId = order.sellerId ?? null
        }
      }
      if (!sellerId && orderItemId) {
        const orderItem = await prisma.orderItem.findUnique({ where: { id: orderItemId }, include: { product: true } })
        if (orderItem?.product?.ownerId) sellerId = orderItem.product.ownerId
      }
      const created = await prisma.supportTicket.create({
        data: {
          subject: String(subject).trim(),
          type: ['general', 'order', 'service', 'billing'].includes(String(type)) ? String(type) : 'general',
          priority: String(priority || 'normal'),
          orderId: order?.id || (orderId || null),
          orderItemId: orderItemId || null,
          requesterId: uid,
          sellerId,
          messages: {
            create: [{ body: String(body), authorId: uid }],
          },
        },
        include: ticketInclude,
      })
      if (created.seller?.email) {
        await sendMarketplaceEmail({
          to: created.seller.email,
          subject: 'New Hedgetech support ticket',
          html: `<p>You have a new support ticket from ${created.requester?.name || created.requester?.email || 'a buyer'}.</p><p><strong>${created.subject}</strong></p><p>${body}</p>`,
        })
      }
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/support/tickets error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/support/tickets/:id/messages', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing ticket id' })
      const ticket = await prisma.supportTicket.findUnique({ where: { id } })
      if (!ticket) return res.status(404).json({ error: 'Not found' })
      if (!canViewTicket(req.user, ticket)) return res.status(403).json({ error: 'Forbidden' })
      const { body, attachments } = req.body || {}
      if (!body) return res.status(400).json({ error: 'Message body required' })
      const message = await prisma.supportMessage.create({
        data: {
          ticketId: id,
          authorId: Number.isFinite(Number(req.user.uid)) ? Number(req.user.uid) : null,
          body: String(body),
          attachments: Array.isArray(attachments) ? attachments.map((item) => String(item)) : [],
        },
        include: { author: { select: { id: true, name: true, email: true, image: true } } },
      })
      await prisma.supportTicket.update({ where: { id }, data: { updatedAt: new Date(), status: ticket.status === 'closed' ? 'in_progress' : ticket.status } })
      res.status(201).json(message)
    } catch (e) {
      console.error('POST /api/support/tickets/:id/messages error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/support/tickets/:id/status', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      const { status } = req.body || {}
      if (!id) return res.status(400).json({ error: 'Missing ticket id' })
      const ticket = await prisma.supportTicket.findUnique({ where: { id } })
      if (!ticket) return res.status(404).json({ error: 'Not found' })
      if (!canViewTicket(req.user, ticket)) return res.status(403).json({ error: 'Forbidden' })
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
      if (!validStatuses.includes(String(status))) return res.status(400).json({ error: 'Invalid status' })
      const updated = await prisma.supportTicket.update({ where: { id }, data: { status: String(status) }, include: ticketInclude })
      res.json(updated)
    } catch (e) {
      console.error('POST /api/support/tickets/:id/status error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Refunds & disputes -------------------------------------------------------
  router.post('/orders/:id/refund', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing order id' })
      const uid = Number(req.user.uid)
      if (!Number.isFinite(uid)) return res.status(401).json({ error: 'Unauthorized' })
      const { orderItemId, amount, reason } = req.body || {}
      if (!reason) return res.status(400).json({ error: 'Reason required' })
      const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
      if (!order) return res.status(404).json({ error: 'Order not found' })
      if (req.user.role !== 'admin' && order.buyerId !== uid) return res.status(403).json({ error: 'Forbidden' })
      let sellerId = order.sellerId
      if (!sellerId) {
        const firstItem = order.items[0]
        if (firstItem) {
          const product = await prisma.product.findUnique({ where: { id: firstItem.productId } })
          if (product?.ownerId) sellerId = product.ownerId
        }
      }
      if (orderItemId) {
        const match = order.items.find((item) => item.id === orderItemId)
        if (!match) return res.status(400).json({ error: 'Order item not found on order' })
      }
      const refund = await prisma.refundRequest.create({
        data: {
          orderId: order.id,
          orderItemId: orderItemId || null,
          buyerId: order.buyerId ?? uid,
          sellerId,
          amount: amount != null ? Number(amount) : null,
          reason: String(reason),
        },
        include: {
          order: { select: { id: true, status: true, customerName: true } },
          orderItem: { select: { id: true, title: true } },
        },
      })
      if (sellerId) {
        const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { email: true, name: true } })
        if (seller?.email) {
          await sendMarketplaceEmail({
            to: seller.email,
            subject: 'Refund request awaiting review',
            html: `<p>A buyer requested a refund for order ${order.id}.</p><p>Reason: ${refund.reason}</p>`,
          })
        }
      }
      res.status(201).json(refund)
    } catch (e) {
      console.error('POST /api/orders/:id/refund error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/refunds', ensureAuth, async (req, res) => {
    try {
      const uid = Number(req.user.uid)
      const role = req.user.role
      const scope = String(req.query.scope || '').toLowerCase()
      let where
      if (role === 'admin' || scope === 'all') {
        where = {}
      } else if (scope === 'buyers' || scope === 'buyer') {
        where = { buyerId: uid }
      } else if (scope === 'sellers' || scope === 'seller') {
        where = { sellerId: uid }
      } else {
        where = { OR: [{ buyerId: uid }, { sellerId: uid }] }
      }
      const refunds = await prisma.refundRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, status: true, customerName: true } },
          orderItem: { select: { id: true, title: true } },
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, email: true } },
        },
      })
      res.json(refunds)
    } catch (e) {
      console.error('GET /api/refunds error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/refunds/:id/review', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ error: 'Missing refund id' })
      const refund = await prisma.refundRequest.findUnique({ where: { id }, include: { order: true, buyer: true, seller: true } })
      if (!refund) return res.status(404).json({ error: 'Not found' })
      const uid = Number(req.user.uid)
      if (req.user.role !== 'admin' && refund.sellerId && refund.sellerId !== uid) return res.status(403).json({ error: 'Forbidden' })
      const { action, notes, amount } = req.body || {}
      const normalizedAction = String(action || '').toLowerCase()
      const allowed = ['accept', 'reject', 'refund']
      if (!allowed.includes(normalizedAction)) return res.status(400).json({ error: 'Invalid action' })
      let nextStatus = refund.status
      if (normalizedAction === 'reject') nextStatus = 'rejected'
      if (normalizedAction === 'accept') nextStatus = 'accepted'
      if (normalizedAction === 'refund') nextStatus = 'refunded'
      const patch = {
        status: nextStatus,
        resolution: notes ? String(notes) : refund.resolution,
        amount: amount != null ? Number(amount) : refund.amount,
      }
      const updated = await prisma.refundRequest.update({ where: { id }, data: patch, include: {
        order: true,
        orderItem: { select: { id: true, title: true } },
        buyer: { select: { email: true, name: true } },
        seller: { select: { email: true, name: true } },
      } })
      if (updated.status === 'accepted' || updated.status === 'refunded') {
        await prisma.order.update({ where: { id: updated.orderId }, data: { status: 'refunded' } })
      }
      if (updated.buyer?.email) {
        await sendMarketplaceEmail({
          to: updated.buyer.email,
          subject: 'Refund request update',
          html: `<p>Your refund request for order ${updated.orderId} is now ${updated.status}.</p>${updated.resolution ? `<p>${updated.resolution}</p>` : ''}`,
        })
      }
      res.json(updated)
    } catch (e) {
      console.error('POST /api/refunds/:id/review error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/cart', async (req, res) => {
    try {
      const ownerId = req.query.ownerId ? Number(req.query.ownerId) : (req.user?.uid ? Number(req.user.uid) : NaN)
      if (!Number.isFinite(ownerId)) return res.status(400).send('ownerId required')
      let cart = await prisma.cart.findFirst({ where: { userId: ownerId }, include: { items: true } })
      if (!cart) cart = await prisma.cart.create({ data: { userId: ownerId }, include: { items: true } })
      res.json(cart)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/cart error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/cart', ensureAuth, async (req, res) => {
    try {
      const ownerId = req.query.ownerId ? Number(req.query.ownerId) : (req.user?.uid ? Number(req.user.uid) : NaN)
      if (!Number.isFinite(ownerId)) return res.status(400).send('ownerId required')
      const { productId, quantity = 1, meta } = req.body || {}
      let cart = await prisma.cart.findFirst({ where: { userId: ownerId } })
      if (!cart) cart = await prisma.cart.create({ data: { userId: ownerId } })
      const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId } })
      let item
      if (existing) {
        item = await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: (existing.quantity || 0) + quantity, meta: meta ?? existing.meta } })
      } else {
        item = await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity, meta } })
      }
      res.json(item)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/cart error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.delete('/cart', ensureAuth, async (req, res) => {
    try {
      const ownerId = req.query.ownerId ? Number(req.query.ownerId) : (req.user?.uid ? Number(req.user.uid) : NaN)
      if (!Number.isFinite(ownerId)) return res.status(400).send('ownerId required')
      const id = String(req.query.id || '')
      if (!id) return res.status(400).send('id required')
      await prisma.cartItem.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('DELETE /api/cart error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/checkout', async (req, res) => {
    try {
      const { items = [], customerName, customerEmail, address, customerPhone } = req.body || {}
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items to checkout' })
      const uid = req.user?.uid ? Number(req.user.uid) : null
      const productIds = items.map((i) => i.productId).filter(Boolean)
      if (!productIds.length) return res.status(400).json({ error: 'Invalid cart items' })

      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          ownerId: true,
          type: true,
          title: true,
          stockCount: true,
          serviceOpenDays: true,
          serviceOpenTime: true,
          serviceCloseTime: true,
          serviceDurationMinutes: true,
          serviceDailyCapacity: true,
        },
      })
      const productById = new Map(products.map((p) => [p.id, p]))
      for (const productId of productIds) {
        if (!productById.has(productId)) {
          return res.status(400).json({ error: 'One or more items are no longer available.' })
        }
      }

      const goodsAdjustments = new Map()
      const serviceRequests = new Map()
      const serviceRanges = new Map()

      for (const item of items) {
        const product = productById.get(item.productId)
        if (!product) return res.status(400).json({ error: 'Product not found' })
        const quantity = Math.max(1, Number(item.quantity || 1))

        if (product.type === 'goods') {
          const stock = Number(product.stockCount ?? 0)
          if (quantity > stock) {
            return res.status(409).json({ error: `"${product.title}" only has ${stock} in stock.` })
          }
          goodsAdjustments.set(product.id, (goodsAdjustments.get(product.id) || 0) + quantity)
        } else if (product.type === 'service') {
          if (quantity !== 1) {
            return res.status(400).json({ error: `"${product.title}" appointments must be booked one at a time.` })
          }
          const slotString = item.meta || item.appointmentAt
          if (!slotString) {
            return res.status(400).json({ error: `Select an appointment time for "${product.title}".` })
          }
          const slot = new Date(slotString)
          if (Number.isNaN(slot.getTime())) {
            return res.status(400).json({ error: `Invalid appointment time for "${product.title}".` })
          }
          slot.setSeconds(0, 0)
          const weekday = WEEKDAY_FROM_INDEX[slot.getDay()] || ''
          const openDays = product.serviceOpenDays?.length ? product.serviceOpenDays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          if (!openDays.includes(weekday)) {
            return res.status(400).json({ error: `"${product.title}" does not accept bookings on ${weekday}.` })
          }
          const durationMinutes = Math.max(15, product.serviceDurationMinutes || 60)
          const durationMs = durationMinutes * 60 * 1000
          const dayStart = startOfDay(slot)
          let dayOpen = combineDateAndTime(dayStart, product.serviceOpenTime || '09:00')
          let dayClose = combineDateAndTime(dayStart, product.serviceCloseTime || '17:00')
          if (dayClose <= dayOpen) dayClose = new Date(dayOpen.getTime() + durationMs)
          if (slot < dayOpen || slot >= dayClose) {
            return res.status(400).json({ error: `"${product.title}" offers appointments between ${product.serviceOpenTime || '09:00'} and ${product.serviceCloseTime || '17:00'}.` })
          }
          const offset = slot.getTime() - dayOpen.getTime()
          if (offset % durationMs !== 0) {
            return res.status(400).json({ error: `"${product.title}" uses ${durationMinutes}-minute slots. Please choose a valid time.` })
          }
          const maxSlots = Math.max(1, Math.floor((dayClose.getTime() - dayOpen.getTime()) / durationMs))
          const dailyCapacity = product.serviceDailyCapacity ?? maxSlots
          const dayKey = dayStart.toISOString().slice(0, 10)
          const normalizedSlot = new Date(slot)
          normalizedSlot.setSeconds(0, 0)
          if (!serviceRequests.has(product.id)) serviceRequests.set(product.id, [])
          serviceRequests.get(product.id).push({ slot: normalizedSlot, dayKey, dailyCapacity, title: product.title })
          const existingRange = serviceRanges.get(product.id)
          if (existingRange) {
            if (normalizedSlot < existingRange.min) existingRange.min = normalizedSlot
            if (normalizedSlot > existingRange.max) existingRange.max = normalizedSlot
          } else {
            serviceRanges.set(product.id, { min: normalizedSlot, max: normalizedSlot })
          }
          Object.assign(item, { __normalizedSlot: normalizedSlot })
        }
      }

      const pendingDayCounts = new Map()
      const pendingSlotCounts = new Map()
      for (const [productId, requests] of serviceRequests) {
        const product = productById.get(productId)
        if (!product) continue
        const range = serviceRanges.get(productId)
        const windowStart = startOfDay(range?.min || new Date())
        const windowEnd = addDays(startOfDay(range?.max || new Date()), 1)
        const existingItems = await prisma.orderItem.findMany({
          where: {
            productId,
            appointmentAt: { not: null, gte: windowStart, lt: windowEnd },
            appointmentStatus: { notIn: ['cancelled', 'rejected'] },
          },
          select: { appointmentAt: true },
        })
        const bookedByDay = new Map()
        for (const entry of existingItems) {
          if (!entry.appointmentAt) continue
          const at = new Date(entry.appointmentAt)
          at.setSeconds(0, 0)
          const dayKey = at.toISOString().slice(0, 10)
          const slotKey = at.getTime()
          if (!bookedByDay.has(dayKey)) bookedByDay.set(dayKey, { total: 0, slots: new Map() })
          const bucket = bookedByDay.get(dayKey)
          bucket.total += 1
          bucket.slots.set(slotKey, (bucket.slots.get(slotKey) || 0) + 1)
        }

        for (const request of requests) {
          const slotKey = `${productId}:${request.slot.getTime()}`
          if ((pendingSlotCounts.get(slotKey) || 0) > 0) {
            return res.status(400).json({ error: `Duplicate time selected for "${request.title}".` })
          }
          pendingSlotCounts.set(slotKey, 1)
          const dayKey = request.dayKey
          const dayEntry = bookedByDay.get(dayKey) || { total: 0, slots: new Map() }
          const slotBooked = dayEntry.slots.get(request.slot.getTime()) || 0
          if (slotBooked > 0) {
            return res.status(409).json({ error: `That time for "${request.title}" was just taken. Please pick another slot.` })
          }
          const pendingKey = `${productId}:${dayKey}`
          const pendingTotal = pendingDayCounts.get(pendingKey) || 0
          if (dayEntry.total + pendingTotal >= request.dailyCapacity) {
            return res.status(409).json({ error: `Daily capacity reached for "${request.title}" on ${dayKey}.` })
          }
          pendingDayCounts.set(pendingKey, pendingTotal + 1)
        }
      }

      const groups = new Map()
      for (const item of items) {
        const ownerId = productById.get(item.productId)?.ownerId ?? null
        if (!groups.has(ownerId)) groups.set(ownerId, [])
        groups.get(ownerId).push(item)
      }

      const createdOrders = []
      const serviceOrders = []
      for (const [ownerId, groupItems] of groups) {
        const groupTotal = groupItems.reduce((sum, current) => sum + (Number(current.price) || 0) * (Number(current.quantity) || 0), 0)
        const hasService = groupItems.some((gi) => productById.get(gi.productId)?.type === 'service')
        const order = await prisma.order.create({
          data: {
            buyerId: uid,
            sellerId: ownerId || null,
            total: groupTotal,
            status: hasService ? 'pending' : 'paid',
            customerName,
            customerEmail,
            address,
            customerPhone,
            accessCode: uid == null ? (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)) : null,
            items: {
              create: groupItems.map((i) => ({
                productId: i.productId,
                title: i.title,
                price: Number(i.price) || 0,
                quantity: Number(i.quantity) || 1,
                appointmentAt:
                  productById.get(i.productId)?.type === 'service' && (i.__normalizedSlot || i.meta)
                    ? new Date(i.__normalizedSlot || i.meta)
                    : null,
                appointmentStatus: productById.get(i.productId)?.type === 'service' ? 'requested' : null,
              })),
            },
          },
          include: { items: true },
        })
        createdOrders.push(order)
        if (hasService) serviceOrders.push(order)
      }

      for (const [productId, qty] of goodsAdjustments) {
        await prisma.product.update({ where: { id: productId }, data: { stockCount: { decrement: qty } } })
      }

      if (uid != null) {
        const cart = await prisma.cart.findFirst({ where: { userId: uid }, include: { items: true } })
        if (cart?.items.length) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
      }

      const sellerCache = new Map()
      let buyerUser = null
      if (uid != null) {
        buyerUser = await prisma.user.findUnique({ where: { id: uid }, select: { email: true, name: true } })
      }

      for (const order of serviceOrders) {
        try {
          const serviceItems = order.items.filter((it) => productById.get(it.productId)?.type === 'service')
          if (!serviceItems.length) continue
          let sellerContact = null
          if (order.sellerId) {
            sellerContact = sellerCache.get(order.sellerId)
            if (!sellerContact) {
              sellerContact = await prisma.user.findUnique({ where: { id: order.sellerId }, select: { email: true, name: true } })
              sellerCache.set(order.sellerId, sellerContact)
            }
          }
          const appointmentList = serviceItems
            .map((item) => {
              const at = item.appointmentAt ? new Date(item.appointmentAt) : null
              return `<li><strong>${item.title}</strong> — ${at ? at.toLocaleString() : 'Pending time'}</li>`
            })
            .join('')
          const sellerEmail = sellerContact?.email
          if (sellerEmail) {
            await sendMarketplaceEmail({
              to: sellerEmail,
              subject: 'New service booking request on Hedgetech',
              html: `
                <h2>New booking request</h2>
                <p>You have a new service booking request from ${customerName || customerEmail || buyerUser?.name || buyerUser?.email || 'a Hedgetech buyer'}.</p>
                <ul>${appointmentList}</ul>
                <p>Buyer contact: ${customerEmail || buyerUser?.email || 'Not provided'}${customerPhone ? ` | Phone: ${customerPhone}` : ''}</p>
              `,
            })
          }
          const buyerEmail = customerEmail || buyerUser?.email
          if (buyerEmail) {
            await sendMarketplaceEmail({
              to: buyerEmail,
              subject: 'Your service booking request is pending confirmation',
              html: `
                <h2>We received your service request</h2>
                <p>Thanks for booking with Hedgetech. The provider will confirm the appointment shortly.</p>
                <ul>${appointmentList}</ul>
                <p>We will email you once the provider confirms.</p>
              `,
            })
          }
        } catch (err) {
          console.error('Failed to send service booking email:', err)
        }
      }

      res.status(201).json(createdOrders[0] || null)
    } catch (e) {
      console.error('POST /api/checkout error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // POS: Seller creates an in-person order and records payment
  router.post('/pos/orders', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const { items = [], customerName, customerEmail, customerPhone } = req.body || {}
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items required' })

      const productIds = items.map((i) => i.productId).filter(Boolean)
      const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, ownerId: true } })
      const byId = new Map(products.map((p) => [p.id, p]))
      // Validate seller owns all products
      for (const i of items) {
        const p = byId.get(i.productId)
        if (!p || p.ownerId !== sellerId) return res.status(403).json({ error: 'Cannot sell items you do not own' })
      }

      const total = items.reduce((a, c) => a + Number(c.price || 0) * Number(c.quantity || 0), 0)
      const order = await prisma.order.create({
        data: {
          buyerId: null,
          sellerId,
          total: Math.max(0, Math.round(total)),
          status: 'paid',
          customerName: customerName || null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          items: { create: items.map((i) => ({
            productId: i.productId,
            title: i.title,
            price: Number(i.price || 0),
            quantity: Number(i.quantity || 1),
          })) },
        },
        include: { items: true },
      })
      res.status(201).json(order)
    } catch (e) {
      console.error('POST /api/pos/orders error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.get('/orders', async (req, res) => {
    try {
      const ownerId = req.query.ownerId ? Number(req.query.ownerId) : (req.user?.uid ? Number(req.user.uid) : NaN)
      if (!Number.isFinite(ownerId)) return res.status(400).send('ownerId required')
      const orders = await prisma.order.findMany({ where: { buyerId: ownerId }, orderBy: { createdAt: 'desc' }, include: { items: { include: { product: true } } } })
      res.json(orders)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/orders error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Public order tracking by access code (must be before '/orders/:id')
  router.get('/orders/track', async (req, res) => {
    try {
      const code = String(req.query.code || '')
      if (!code) return res.status(400).json({ error: 'Missing code' })
      let order = await prisma.order.findFirst({
        where: { accessCode: code },
        include: { items: { include: { product: true } }, seller: true },
      })
      // Fallback for convenience: if a guest pastes the order id instead of the access code,
      // allow tracking by id as long as the order has an accessCode (guest checkout only).
      if (!order) {
        const byId = await prisma.order.findUnique({
          where: { id: code },
          include: { items: { include: { product: true } }, seller: true },
        })
        if (byId?.accessCode) order = byId
      }
      if (!order) return res.status(404).json({ error: 'Not found' })
      res.json(order)
    } catch (e) {
      console.error('GET /api/orders/track error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/orders/pay-with-code', async (req, res) => {
    try {
      const { code, paymentMethod } = req.body || {}
      const normalized = String(code || '').trim()
      if (!normalized) return res.status(400).json({ error: 'Missing code' })
      const order = await prisma.order.findFirst({ where: { accessCode: normalized } })
      if (!order) return res.status(404).json({ error: 'Order not found' })
      if (!['pending', 'scheduled'].includes(order.status)) {
        return res.status(400).json({ error: 'Order is already paid or closed' })
      }
      const updated = await prisma.order.update({ where: { id: order.id }, data: { status: 'paid' } })
      // Future: persist payment intent / receipt. For now acknowledge request.
      res.json({ id: updated.id, status: updated.status, paymentMethod: paymentMethod || 'card' })
    } catch (e) {
      console.error('POST /api/orders/pay-with-code error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Secure single-order fetch for buyer or seller
  router.get('/orders/:id', ensureAuth, async (req, res) => {
    try {
      const uid = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(uid)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      // Fetch order with relations
      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, buyer: true, seller: true },
      })
      if (!order) return res.status(404).json({ error: 'Not found' })
      // Authorize: buyer or seller (explicit or via product owner)
      const isBuyer = order.buyerId === uid
      const isSeller = order.sellerId === uid || order.items.some((it) => it.product?.ownerId === uid)
      if (!isBuyer && !isSeller) return res.status(403).json({ error: 'Forbidden' })
      res.json(order)
    } catch (e) {
      console.error('GET /api/orders/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  

  // Admin: list all orders across buyers and sellers
  router.get('/admin/orders', ensureAuth, async (_req, res) => {
    try {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true, buyer: true, seller: true },
      })
      res.json(orders)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/admin/orders error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Seller orders listing for dashboard
  router.get('/seller/orders', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { sellerId },
            { items: { some: { product: { ownerId: sellerId } } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true } }, buyer: true },
      })
      res.json(orders)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/seller/orders error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Seller confirms service appointments for an order (sets appointmentStatus to 'confirmed' and order to 'scheduled')
  router.post('/orders/:id/confirm-appointment', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          buyer: { select: { email: true, name: true } },
        },
      })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      const serviceItemIds = order.items.filter((it) => it.product?.type === 'service').map((it) => it.id)
      if (serviceItemIds.length === 0) return res.status(400).json({ error: 'No service items to confirm' })
      await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentStatus: 'confirmed' } })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'scheduled' } })
      const buyerEmail = order.customerEmail || order.buyer?.email
      if (buyerEmail) {
        try {
          const appointments = order.items
            .filter((item) => item.product?.type === 'service')
            .map((item) => {
              const when = item.appointmentAt ? new Date(item.appointmentAt).toLocaleString() : 'Pending time'
              return `<li><strong>${item.title}</strong> — ${when}</li>`
            })
            .join('')
          await sendMarketplaceEmail({
            to: buyerEmail,
            subject: 'Your Hedgetech appointment is confirmed',
            html: `
              <h2>Appointment confirmed</h2>
              <p>Your provider confirmed the following service booking:</p>
              <ul>${appointments}</ul>
              <p>We look forward to seeing you.</p>
            `,
          })
        } catch (err) {
          console.error('Failed to send confirmation email:', err)
        }
      }
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/confirm-appointment error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Seller marks service as completed
  router.post('/orders/:id/complete-service', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const order = await prisma.order.findUnique({ where: { id } })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'completed' } })
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/complete-service error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Seller rejects requested appointment and optionally proposes alternates (array of ISO strings)
  router.post('/orders/:id/appointment/reject-propose', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const { proposals } = req.body || {}
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          buyer: { select: { email: true, name: true } },
        },
      })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      const serviceItemIds = order.items.filter((it) => it.product?.type === 'service').map((it) => it.id)
      if (serviceItemIds.length === 0) return res.status(400).json({ error: 'No service items to update' })
      const alternatesJson = Array.isArray(proposals) ? JSON.stringify(proposals) : JSON.stringify([])
      await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentStatus: proposals && proposals.length ? 'proposed' : 'rejected', appointmentAlternates: alternatesJson } })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'pending' } })
      const buyerEmail = order.customerEmail || order.buyer?.email
      if (buyerEmail) {
        try {
          const proposalList = Array.isArray(proposals) && proposals.length
            ? proposals
                .map((p) => {
                  const dt = new Date(p)
                  return Number.isNaN(dt.getTime()) ? null : `<li>${dt.toLocaleString()}</li>`
                })
                .filter(Boolean)
                .join('')
            : ''
          await sendMarketplaceEmail({
            to: buyerEmail,
            subject: proposals && proposals.length ? 'New appointment times proposed' : 'Appointment request declined',
            html: proposals && proposals.length
              ? `
                <h2>New appointment options</h2>
                <p>Your provider proposed new times for your service booking:</p>
                <ul>${proposalList}</ul>
                <p>Sign in to Hedgetech to choose one of the proposed slots.</p>
              `
              : `
                <h2>Appointment update</h2>
                <p>Your provider was unable to accept the requested time. Please sign in to propose a new slot.</p>
              `,
          })
        } catch (err) {
          console.error('Failed to send appointment proposal email:', err)
        }
      }
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/appointment/reject-propose error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Buyer accepts one of seller's proposed alternates
  router.post('/orders/:id/appointment/accept', ensureAuth, async (req, res) => {
    try {
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const { date } = req.body || {}
      if (!date) return res.status(400).json({ error: 'Missing date' })
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          seller: { select: { email: true, name: true } },
          buyer: { select: { email: true, name: true } },
        },
      })
      if (!order || order.buyerId !== buyerId) return res.status(404).json({ error: 'Order not found' })
      const serviceItemIds = order.items.filter((it) => it.product?.type === 'service').map((it) => it.id)
      await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentAt: new Date(date), appointmentStatus: 'scheduled', appointmentAlternates: null } })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'scheduled' } })
      try {
        const appointmentTime = new Date(date)
        const formatted = Number.isNaN(appointmentTime.getTime()) ? null : appointmentTime.toLocaleString()
        const serviceTitles = order.items.filter((it) => it.product?.type === 'service').map((it) => it.title).join(', ')
        const sellerEmail = order.seller?.email
        if (sellerEmail) {
          await sendMarketplaceEmail({
            to: sellerEmail,
            subject: 'A buyer accepted your proposed appointment',
            html: `
              <h2>Appointment scheduled</h2>
              <p>Your buyer confirmed ${serviceTitles || 'the service booking'} for ${formatted || 'the selected time'}.</p>
              <p>Get ready to deliver the service.</p>
            `,
          })
        }
        const buyerEmail = order.customerEmail || order.buyer?.email
        if (buyerEmail) {
          await sendMarketplaceEmail({
            to: buyerEmail,
            subject: 'Appointment scheduled with your provider',
            html: `
              <h2>Appointment locked in</h2>
              <p>You scheduled ${serviceTitles || 'your service'} for ${formatted || 'the selected time'}.</p>
              <p>If you need to make any changes, contact your provider.</p>
            `,
          })
        }
      } catch (err) {
        console.error('Failed to send appointment acceptance emails:', err)
      }
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/appointment/accept error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Buyer pays for a completed service
  router.post('/orders/:id/pay', ensureAuth, async (req, res) => {
    try {
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const order = await prisma.order.findUnique({ where: { id } })
      if (!order || order.buyerId !== buyerId) return res.status(404).json({ error: 'Order not found' })
      if (order.status !== 'completed') return res.status(400).json({ error: 'Order not completed' })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'paid' } })
      res.json(updated)
    } catch (e) {
      console.error('POST /api/orders/:id/pay error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Seller marks order as shipped (must acknowledge paid)
  router.post('/orders/:id/ship', ensureAuth, async (req, res) => {
    try {
      const sellerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(sellerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const { ackPaid } = req.body || {}
      if (ackPaid !== true) return res.status(400).json({ error: 'Must acknowledge payment before shipping' })
      const order = await prisma.order.findUnique({ where: { id } })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      if (order.status !== 'paid') return res.status(400).json({ error: 'Order not in paid status' })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'shipped' } })
      res.json(updated)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/orders/:id/ship error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Buyer confirms receipt
  router.post('/orders/:id/received', ensureAuth, async (req, res) => {
    try {
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const order = await prisma.order.findUnique({ where: { id } })
      if (!order || order.buyerId !== buyerId) return res.status(404).json({ error: 'Order not found' })
      if (order.status !== 'shipped') return res.status(400).json({ error: 'Order not in shipped status' })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'completed' } })
      res.json(updated)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/orders/:id/received error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })


  // Buyer leaves a review (rating + feedback) on a paid/shipped/completed order
  router.get('/orders/:id/review', ensureAuth, async (req, res) => {
    try {
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const review = await prisma.orderReview.findUnique({ where: { orderId: id } })
      if (!review || review.buyerId !== buyerId) return res.json(null)
      res.json({ rating: review.rating, feedback: review.feedback })
    } catch (e) {
      console.error('GET /api/orders/:id/review error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/orders/:id/review', ensureAuth, async (req, res) => {
    try {
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')
      const id = String(req.params.id)
      const { rating, feedback } = req.body || {}
      const r = Number(rating)
      if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be 1-5' })
      if (!feedback || String(feedback).trim().length < 3) return res.status(400).json({ error: 'Feedback required' })
      const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
      if (!order || order.buyerId !== buyerId) return res.status(404).json({ error: 'Order not found' })
      if (!['paid', 'shipped', 'completed'].includes(order.status)) return res.status(400).json({ error: 'Order not eligible for review' })
      // Disallow multiple ratings for the same order
      const existing = await prisma.orderReview.findUnique({ where: { orderId: id } })
      if (existing) return res.status(400).json({ error: 'You have already rated this order' })
      const sellerId = order.sellerId ?? (order.items[0]?.product?.ownerId ?? null)
      if (!sellerId) return res.status(400).json({ error: 'Missing seller' })
      const saved = await prisma.orderReview.create({ data: { orderId: id, buyerId, sellerId, rating: r, feedback: String(feedback).trim() } })
      res.json({ rating: saved.rating, feedback: saved.feedback })
    } catch (e) {
      console.error('POST /api/orders/:id/review error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Public user lookup by id for displaying seller summary
  router.get('/users/:id', async (req, res) => {
    try {
      const id = Number(req.params.id)
      if (!Number.isFinite(id)) return res.status(400).send('Invalid id')
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, image: true, createdAt: true, phoneNo: true, ABN: true } })
      if (!user) return res.status(404).json(null)
      const rep = await prisma.userReputation.findUnique({ where: { userId: id } })
      let avg = 5
      try {
        const a = await prisma.orderReview.aggregate({ where: { sellerId: id }, _avg: { rating: true } })
        avg = a?._avg?.rating || 5
      } catch {}
      const negativeCount = rep?.negativeCount || 0
      const rating = compositeRating(avg, negativeCount)
      res.json({ ...user, rating, averageRating: avg, negativeCount })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/users/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Public: list seller reviews + summary
  router.get('/users/:id/reviews', async (req, res) => {
    try {
      const sellerId = Number(req.params.id)
      if (!Number.isFinite(sellerId)) return res.status(400).send('Invalid id')

      // Aggregate average and counts per rating
      let avg = 0
      let count = 0
      const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      try {
        if (prisma?.orderReview?.groupBy) {
          const byRating = await prisma.orderReview.groupBy({
            by: ['sellerId', 'rating'],
            where: { sellerId },
            _count: { _all: true },
          })
          for (const r of byRating) {
            const rt = Number(r.rating)
            const c = r._count?._all || 0
            if (histogram[rt] != null) histogram[rt] += c
            count += c
            avg += rt * c
          }
          avg = count > 0 ? avg / count : 0
        } else {
          // Fallback: fetch reviews and compute in JS
          const all = await prisma.orderReview.findMany({ where: { sellerId }, select: { rating: true } })
          for (const r of all) {
            const rt = Number(r.rating)
            if (histogram[rt] != null) histogram[rt] += 1
            count += 1
            avg += rt
          }
          avg = count > 0 ? avg / count : 0
        }
      } catch {
        // ignore aggregation errors
      }

      const reviews = await prisma.orderReview.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        select: {
          orderId: true,
          rating: true,
          feedback: true,
          createdAt: true,
          buyer: { select: { id: true, name: true, email: true, image: true } },
        },
      })

      // Include composite with negative report penalty
      const rep = await prisma.userReputation.findUnique({ where: { userId: sellerId } })
      const negativeCount = rep?.negativeCount || 0
      const composite = compositeRating(avg || 5, negativeCount)
      res.json({ avg, count, histogram, reviews, composite, negativeCount })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('GET /api/users/:id/reviews error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.post('/users/:id/rate-negative', ensureAuth, async (req, res) => {
    try {
      const sellerId = Number(req.params.id)
      if (!Number.isFinite(sellerId)) return res.status(400).send('Invalid id')
      const { reason } = req.body || {}
      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        return res.status(400).json({ error: 'Reason is required' })
      }
      const buyerId = req.user?.uid ? Number(req.user.uid) : NaN
      if (!Number.isFinite(buyerId)) return res.status(401).send('Unauthorized')

      // Verify buyer has at least one PAID order containing a product by this seller
      const eligibleOrder = await prisma.order.findFirst({
        where: {
          buyerId,
          status: 'paid',
          items: { some: { product: { ownerId: sellerId } } },
        },
        select: { id: true },
      })
      if (!eligibleOrder) {
        return res.status(403).json({ error: 'Not eligible to report' })
      }

      // Record report and update reputation
      await prisma.negativeReport.create({ data: { buyerId, sellerId, orderId: eligibleOrder.id, reason: String(reason).trim() } })
      const updated = await prisma.userReputation.upsert({
        where: { userId: sellerId },
        update: { negativeCount: { increment: 1 } },
        create: { userId: sellerId, negativeCount: 1 },
      })
      const rating = Math.max(1, 5 - (updated?.negativeCount || 0))
      res.json({ negativeCount: updated.negativeCount, rating })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/users/:id/rate-negative error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Admin: update order status (confirm paid, posted/shipped, completed, cancelled)
  router.post('/admin/orders/:id/status', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id)
      const { status } = req.body || {}
      const allowed = ['pending', 'paid', 'shipped', 'completed', 'cancelled']
      if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' })
      const exists = await prisma.order.findUnique({ where: { id } })
      if (!exists) return res.status(404).json({ error: 'Not found' })
      const updated = await prisma.order.update({ where: { id }, data: { status } })
      res.json(updated)
    } catch (e) {
      console.error('POST /api/admin/orders/:id/status error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Admin: delete an order
  router.delete('/admin/orders/:id', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id)
      await prisma.order.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      console.error('DELETE /api/admin/orders/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Blog: list published posts or author posts
  router.get('/blog/posts', async (req, res) => {
    try {
      const author = req.query.authorId ? Number(req.query.authorId) : undefined
      const where = author ? { authorId: author } : { published: true }
      const posts = await prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, slug: true, title: true, coverImage: true, tags: true, createdAt: true, published: true, authorId: true },
      })
      res.json(posts)
    } catch (e) {
      console.error('GET /api/blog/posts error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Blog: fetch by slug
  router.get('/blog/posts/:slug', async (req, res) => {
    try {
      const slug = String(req.params.slug)
      const post = await prisma.blogPost.findUnique({ where: { slug } })
      if (!post || (!post.published && !req.user?.uid)) return res.status(404).json({ error: 'Not found' })
      res.json(post)
    } catch (e) {
      console.error('GET /api/blog/posts/:slug error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Blog: create new post
  router.post('/blog/posts', ensureAuth, async (req, res) => {
    try {
      const { title, slug, content, coverImage, tags = [], published = false } = req.body || {}
      if (!title || !slug || !content) return res.status(400).json({ error: 'Missing required fields' })
      const data = { title, slug, content, coverImage: coverImage || null, tags: Array.isArray(tags) ? tags : [], published: !!published, authorId: req.user?.uid ? Number(req.user.uid) : null }
      const created = await prisma.blogPost.create({ data })
      res.status(201).json(created)
    } catch (e) {
      console.error('POST /api/blog/posts error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Blog: update post by id
  router.put('/blog/posts/:id', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id)
      const { title, slug, content, coverImage, tags, published } = req.body || {}
      const data = {
        title: title ?? undefined,
        slug: slug ?? undefined,
        content: content ?? undefined,
        coverImage: coverImage === undefined ? undefined : (coverImage || null),
        tags: Array.isArray(tags) ? tags : undefined,
        published: typeof published === 'boolean' ? published : undefined,
      }
      const updated = await prisma.blogPost.update({ where: { id }, data })
      res.json(updated)
    } catch (e) {
      console.error('PUT /api/blog/posts/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // Blog: delete post
  router.delete('/blog/posts/:id', ensureAuth, async (req, res) => {
    try {
      const id = String(req.params.id)
      await prisma.blogPost.delete({ where: { id } })
      res.status(204).end()
    } catch (e) {
      console.error('DELETE /api/blog/posts/:id error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // AI: generate a marketing description for a product
  router.post('/ai/description', async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return res.status(400).json({ error: 'Missing OPENAI_API_KEY' })

      const {
        title,
        price,
        type,
        categoryName,
        seller,
        tone = 'friendly',
        existing,
        existingDescription,
        description,
      } = req.body || {}

      if (!title) return res.status(400).json({ error: 'Missing title' })

      const sys = `You are a helpful product copywriter for an online marketplace in Australia. Write concise, persuasive descriptions (120–220 words) with short paragraphs.`
      const existingNotes = String(existing || existingDescription || description || '').trim()
      const user = `Write a ${tone} product description for the following item:

Name: ${title}
${Number.isFinite(Number(price)) ? `Price: A$${Number(price)}` : ''}
${type ? `Type: ${type}` : ''}
${categoryName ? `Category: ${categoryName}` : ''}
${seller ? `Seller: ${seller}` : ''}
${existingNotes ? `\nExisting notes/details (incorporate and improve):\n${existingNotes}` : ''}

Guidelines:
- Open with a strong single-sentence hook
- Summarise key benefits (not just features)
- Use clear, simple language; no hype words like “best ever”
- Add a short scannable list of 3 benefit bullets
- End with a one‑line call to action

Output as plain text with paragraphs separated by a blank line. Include the 3 bullets as a dash list.`

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
    } catch (e) {
      console.error('POST /api/ai/description error:', e)
      return res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  // One-off: apply missing Product columns (description TEXT, images TEXT[])
  // Protected via secret key. Invoke with: POST /api/admin/migrate/product-columns?key=STACK_SECRET_SERVER_KEY
  router.post('/admin/migrate/product-columns', async (req, res) => {
    try {
      const provided = String(req.query.key || req.headers['x-admin-key'] || '')
      const secret = String(process.env.STACK_SECRET_SERVER_KEY || '')
      if (!secret || provided !== secret) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const results = []
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "description" TEXT')
        results.push({ op: 'add_column', column: 'description', ok: true })
      } catch (e) {
        results.push({ op: 'add_column', column: 'description', ok: false, error: e?.message || String(e) })
      }
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "images" TEXT[]')
        results.push({ op: 'add_column', column: 'images', ok: true })
      } catch (e) {
        results.push({ op: 'add_column', column: 'images', ok: false, error: e?.message || String(e) })
      }
      return res.json({ ok: true, results })
    } catch (e) {
      console.error('POST /api/admin/migrate/product-columns error:', e)
      return res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  
  return router
}
