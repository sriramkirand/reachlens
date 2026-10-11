import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ulid } from 'ulid'
import type { Env } from './env'
import { createAuth } from './auth'
import { uploads } from './routes/uploads'
import { contacts } from './routes/contacts'
import { log } from './lib/logger'

export const app = new Hono<{ Bindings: Env }>()
  .use('*', async (c, next) => {
    const reqId = ulid()
    const t0 = Date.now()
    await next()
    c.res.headers.set('x-request-id', reqId)
    log('info', 'req', { reqId, method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - t0 })
  })
  .on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw))
  .route('/api', uploads)
  .route('/api/contacts', contacts)
  .get('/api/health', (c) => c.json({ ok: true }))
  .onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message || (err.status === 404 ? 'Not found' : 'Error') }, err.status)
    log('error', 'unhandled', { err: String(err), path: c.req.path })
    return c.json({ error: 'Internal error' }, 500)
  })

export type AppType = typeof app
