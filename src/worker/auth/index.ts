import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import { ulid } from 'ulid'
import type { Env } from '../env'
import * as schema from '../db/schema'

export function createAuth(env: Env) {
  const db = drizzle(env.DB, { schema })
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL.replace(/\/+$/, ""),
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
    socialProviders: google,
    advanced: { database: { generateId: () => ulid() } },
    plugins: [organization({ creatorRole: 'owner' })],
    databaseHooks: {
      session: {
        create: {
          // Auto-select the user's first org so every session has an active tenant.
          before: async (sess) => {
            const row = await env.DB.prepare('SELECT organization_id AS id FROM member WHERE user_id = ? ORDER BY created_at LIMIT 1')
              .bind(sess.userId)
              .first<{ id: string }>()
            return { data: { ...sess, activeOrganizationId: row?.id ?? null } }
          },
        },
      },
    },
  })
}
export type Auth = ReturnType<typeof createAuth>
