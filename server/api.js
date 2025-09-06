import express from 'express'
import { getPrisma } from './prisma.js'
import { ensureAuth } from './auth.js'

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

  router.get('/health', (_req, res) => res.json({ ok: true }))

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

  router.post('/products', ensureAuth, async (req, res) => {
    try {
      let { images, description, ...rest } = req.body || {}
      if (typeof images === 'string') {
        images = images
          .split(/\n|,/) // split on newlines or commas
          .map((s) => String(s).trim())
          .filter(Boolean)
      }
      if (!Array.isArray(images)) images = undefined
      const data = { ...rest, description: description ?? null, images, ownerId: req.user.uid }
      const created = await prisma.product.create({ data })
      res.status(201).json(created)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/products error:', e)
      res.status(500).json({ error: e?.message || 'Internal Error' })
    }
  })

  router.put('/products', ensureAuth, async (req, res) => {
    try {
      const { id, images, description, ...rest } = req.body || {}
      if (!id) return res.status(400).send('Missing id')
      let imagesArr = images
      if (typeof images === 'string') {
        imagesArr = images
          .split(/\n|,/) // split on newlines or commas
          .map((s) => String(s).trim())
          .filter(Boolean)
      }
      const data = {
        ...rest,
        description: description ?? undefined,
        images: Array.isArray(imagesArr) ? imagesArr : undefined,
      }
      const updated = await prisma.product.update({ where: { id }, data })
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
      const uid = req.user?.uid ? Number(req.user.uid) : null
      // Lookup products to determine owners and types
      const productIds = (items || []).map((i) => i.productId)
      const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, ownerId: true, type: true } })
      const productById = new Map(products.map((p) => [p.id, p]))
      // Group items by ownerId
      const groups = new Map()
      for (const i of items) {
        const ownerId = productById.get(i.productId)?.ownerId ?? null
        if (!groups.has(ownerId)) groups.set(ownerId, [])
        groups.get(ownerId).push(i)
      }
      const createdOrders = []
      for (const [ownerId, groupItems] of groups) {
        const groupTotal = groupItems.reduce((a, c) => a + (c.price || 0) * (c.quantity || 0), 0)
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
            items: { create: groupItems.map((i) => ({
              productId: i.productId,
              title: i.title,
              price: i.price,
              quantity: i.quantity,
              appointmentAt: productById.get(i.productId)?.type === 'service' && i.meta ? new Date(i.meta) : null,
              appointmentStatus: productById.get(i.productId)?.type === 'service' ? 'requested' : null,
            })) },
          },
          include: { items: true },
        })
        createdOrders.push(order)
      }
      // Clear buyer's cart
      if (uid != null) {
        const cart = await prisma.cart.findFirst({ where: { userId: uid }, include: { items: true } })
        if (cart?.items.length) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
      }
      // Return the first order for backward-compatibility
      res.status(201).json(createdOrders[0] || null)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('POST /api/checkout error:', e)
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
      const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      const serviceItemIds = order.items.filter((it) => it.product?.type === 'service').map((it) => it.id)
      if (serviceItemIds.length === 0) return res.status(400).json({ error: 'No service items to confirm' })
      await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentStatus: 'confirmed' } })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'scheduled' } })
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
      const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
      if (!order || order.sellerId !== sellerId) return res.status(404).json({ error: 'Order not found' })
      const serviceItemIds = order.items.filter((it) => it.product?.type === 'service').map((it) => it.id)
      if (serviceItemIds.length === 0) return res.status(400).json({ error: 'No service items to update' })
      const alternatesJson = Array.isArray(proposals) ? JSON.stringify(proposals) : JSON.stringify([])
      await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentStatus: proposals && proposals.length ? 'proposed' : 'rejected', appointmentAlternates: alternatesJson } })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'pending' } })
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
      const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
      if (!order || order.buyerId !== buyerId) return res.status(404).json({ error: 'Order not found' })
      const serviceItemIds = order.items.filter((it) => it.product?.type === 'service').map((it) => it.id)
      await prisma.orderItem.updateMany({ where: { id: { in: serviceItemIds } }, data: { appointmentAt: new Date(date), appointmentStatus: 'scheduled', appointmentAlternates: null } })
      const updated = await prisma.order.update({ where: { id }, data: { status: 'scheduled' } })
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


  return router
}
