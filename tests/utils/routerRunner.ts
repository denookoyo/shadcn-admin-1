import type { Router, RequestHandler } from 'express'
import { EventEmitter } from 'node:events'
import { match, type MatchFunction } from 'path-to-regexp'
import { serialize, type CookieSerializeOptions } from 'cookie'

type ExpressRequest = Parameters<RequestHandler>[0]
type ExpressResponse = Parameters<RequestHandler>[1]

type RequestInit = {
  body?: unknown
  headers?: Record<string, string | number | boolean | undefined>
  cookies?: Record<string, string>
  user?: unknown
  query?: Record<string, unknown>
  params?: Record<string, string>
  protocol?: 'http' | 'https'
  hostname?: string
}

type RouteMatch = {
  handlers: RequestHandler[]
  params: Record<string, string>
}

type PathMatcher = (path: string) => { params: Record<string, string> } | null

type LayerRoute = {
  path?: string | RegExp | Array<string | RegExp>
  methods: Record<string, boolean>
  stack: Array<{ handle: RequestHandler }>
}

type RouterLayer = { route?: LayerRoute }

const matcherCache = new WeakMap<LayerRoute, PathMatcher[]>()

export class MockResponse extends EventEmitter {
  statusCode = 200
  private headers = new Map<string, string | string[]>()
  body: unknown
  finished = false
  locals: Record<string, unknown> = {}

  status(code: number) {
    this.statusCode = code
    return this
  }

  set(field: string, value: string | string[]) {
    this.setHeader(field, value)
    return this
  }

  type(value: string) {
    this.setHeader('content-type', value)
    return this
  }

  setHeader(field: string, value: string | string[]) {
    this.headers.set(field.toLowerCase(), value)
  }

  get(field: string) {
    return this.getHeader(field)
  }

  getHeader(field: string) {
    return this.headers.get(field.toLowerCase())
  }

  cookie(name: string, value: string, options: CookieSerializeOptions = {}) {
    const serialized = serialize(name, value, options)
    const existing = this.headers.get('set-cookie')
    if (existing) {
      const arr = Array.isArray(existing) ? existing : [existing]
      this.headers.set('set-cookie', [...arr, serialized])
    } else {
      this.headers.set('set-cookie', [serialized])
    }
    return this
  }

  clearCookie(name: string, options: CookieSerializeOptions = {}) {
    return this.cookie(name, '', { ...options, maxAge: 0, expires: new Date(1) })
  }

  json(value: unknown) {
    this.type('application/json; charset=utf-8')
    this.body = value
    this.finished = true
    return this
  }

  send(value: unknown) {
    this.body = value
    this.finished = true
    return this
  }

  sendStatus(code: number) {
    this.status(code)
    this.send(String(code))
    return this
  }

  end(value?: unknown) {
    if (value !== undefined) this.body = value
    this.finished = true
    return this
  }

  getHeaders() {
    const result: Record<string, string | string[]> = {}
    for (const [key, value] of this.headers.entries()) {
      result[key] = value
    }
    return result
  }
}

class MockRequest extends EventEmitter {
  method: string
  url: string
  originalUrl: string
  path: string
  headers: Record<string, string>
  cookies: Record<string, string>
  signedCookies: Record<string, string>
  user: unknown
  body: unknown
  query: Record<string, unknown>
  params: Record<string, string>
  protocol: 'http' | 'https'
  hostname: string
  baseUrl = ''

  constructor(method: string, path: string, init: RequestInit) {
    super()
    const normalizedHeaders: Record<string, string> = {}
    if (init.headers) {
      for (const [key, value] of Object.entries(init.headers)) {
        if (value === undefined) continue
        normalizedHeaders[key.toLowerCase()] = String(value)
      }
    }
    if (!normalizedHeaders.host) normalizedHeaders.host = init.hostname || 'localhost:5173'

    this.method = method.toUpperCase()
    this.url = path
    this.originalUrl = path
    this.path = path
    this.headers = normalizedHeaders
    this.cookies = init.cookies || {}
    this.signedCookies = {}
    this.user = init.user
    this.body = init.body
    this.query = init.query || {}
    this.params = init.params || {}
    this.protocol = init.protocol || 'http'
    this.hostname = init.hostname || normalizedHeaders.host?.split(':')[0] || 'localhost'
  }

  get(field: string) {
    return this.headers[field.toLowerCase()]
  }

  header(field: string) {
    return this.get(field)
  }
}

function createMatchers(route: LayerRoute): PathMatcher[] {
  const rawPaths = Array.isArray(route.path) ? route.path : [route.path]
  return rawPaths.map((rawPath) => {
    if (!rawPath || rawPath === '*') {
      return () => ({ params: {} })
    }
    if (rawPath instanceof RegExp) {
      return (candidate: string) => (rawPath.test(candidate) ? { params: {} } : null)
    }
    const matcher: MatchFunction<Record<string, string>> = match(rawPath, { decode: decodeURIComponent })
    return (candidate: string) => {
      const result = matcher(candidate)
      return result ? { params: result.params } : null
    }
  })
}

function getRouteMatchers(route: LayerRoute) {
  if (!matcherCache.has(route)) {
    matcherCache.set(route, createMatchers(route))
  }
  return matcherCache.get(route)!
}

function getRouterLayers(router: Router): RouterLayer[] {
  const candidate = (router as unknown as { stack?: RouterLayer[] }).stack
  if (!Array.isArray(candidate)) return []
  return candidate
}

function findRoute(router: Router, method: string, path: string): RouteMatch | null {
  const lowerMethod = method.toLowerCase()
  const layers = getRouterLayers(router)
  for (const layer of layers) {
    if (!layer.route || !layer.route.methods?.[lowerMethod]) continue
    const matchers = getRouteMatchers(layer.route)
    for (const matcher of matchers) {
      const matched = matcher(path)
      if (matched) {
        const handlers = layer.route.stack.map((stackLayer) => stackLayer.handle)
        return { handlers, params: matched.params ?? {} }
      }
    }
  }
  return null
}

async function runHandler(handler: RequestHandler, req: MockRequest, res: MockResponse): Promise<void> {
  if (handler.length > 3) {
    // Skip error handlers in this simple runner
    return
  }

  if (handler.length < 3) {
    await handler(req as unknown as ExpressRequest, res as unknown as ExpressResponse)
    return
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const maybePromise = handler(req as unknown as ExpressRequest, res as unknown as ExpressResponse, (err?: unknown) => {
      if (settled) return
      settled = true
      if (err) reject(err)
      else resolve()
    })
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise
        .then(() => {
          if (!settled) {
            settled = true
            resolve()
          }
        })
        .catch((err: unknown) => {
          if (!settled) {
            settled = true
            reject(err)
          }
        })
    } else if (!settled) {
      settled = true
      resolve()
    }
  })
}

export type RouterRunResult = {
  status: number
  body: unknown
  headers: Record<string, string | string[]>
}

export async function runRouter(
  router: Router,
  method: string,
  path: string,
  init: RequestInit = {},
): Promise<RouterRunResult> {
  const route = findRoute(router, method, path)
  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`)
  }
  const req = new MockRequest(method, path, { ...init, params: route.params })
  const res = new MockResponse()

  for (const handler of route.handlers) {
    if (res.finished) break
    await runHandler(handler, req, res)
  }

  return {
    status: res.statusCode,
    body: res.body,
    headers: res.getHeaders(),
  }
}
