import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../env'
import { createAuth } from '../auth'
import { tenantDb, type TenantDb } from '../db/tenant'

export type Role = 'owner' | 'admin' | 'member'
export type AppVars = { userId: string; orgId: string; role: Role; tdb: TenantDb; reqId: string }
export type AppEnv = { Bindings: Env; Variables: AppVars }

const rank: Record<Role, number> = { member: 1, admin: 2, owner: 3 }

/** Resolves session -> active org -> role (verified against member table), builds the tenant-scoped DB. */
export const requireTenant = createMiddleware<AppEnv>(async (c, next) => {
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw new HTTPException(401, { message: 'Unauthenticated' })
  const orgId = session.session.activeOrganizationId
  if (!orgId) throw new HTTPException(409, { message: 'No active organisation' })
  // Always re-verify membership; never trust the session field alone.
  const m = await c.env.DB.prepare('SELECT role FROM member WHERE organization_id = ? AND user_id = ?')
    .bind(orgId, session.user.id)
    .first<{ role: Role }>()
  if (!m) throw new HTTPException(403, { message: 'Not a member of this organisation' })

  const { success } = await c.env.RATE_LIMITER.limit({ key: `org:${orgId}` })
  if (!success) throw new HTTPException(429, { message: 'Rate limit exceeded for this organisation' })

  c.set('userId', session.user.id)
  c.set('orgId', orgId)
  c.set('role', m.role)
  c.set('tdb', tenantDb(c.env.DB, orgId))
  await next()
})

export const requireRole = (min: Role) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (rank[c.get('role')] < rank[min]) throw new HTTPException(403, { message: `Requires ${min} role` })
    await next()
  })
