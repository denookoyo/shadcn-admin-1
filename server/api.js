import express from 'express'
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
