import { and, desc, eq, inArray, isNull, like, or, sql, type SQL } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { ulid } from 'ulid'
import * as s from './schema'

/**
 * The ONLY path from route/queue code to app tables.
 * Every read filters on org_id; every insert stamps org_id; every update/delete
 * is constrained by org_id AND id. Callers cannot pass an org_id of their own
 * for a row, and there is no unscoped accessor.
 */
export function tenantDb(d1: D1Database, orgId: string) {
  if (!orgId) throw new Error('tenantDb requires an orgId')
  const db = drizzle(d1, { schema: s })
  const period = () => new Date().toISOString().slice(0, 7)

  return {
    orgId,

    settings: {
      async get() {
        const [row] = await db.select().from(s.orgSettings).where(eq(s.orgSettings.orgId, orgId))
        if (row) return row
        await db.insert(s.orgSettings).values({ orgId }).onConflictDoNothing()
        const [created] = await db.select().from(s.orgSettings).where(eq(s.orgSettings.orgId, orgId))
        return created!
      },
      async update(patch: Partial<Pick<typeof s.orgSettings.$inferInsert, 'retentionDays' | 'dailyLinkedinCap' | 'cooldownSeconds'>>) {
        await this.get()
        await db.update(s.orgSettings).set(patch).where(eq(s.orgSettings.orgId, orgId))
      },
    },

    batches: {
      async create(v: Omit<typeof s.uploadBatches.$inferInsert, 'id' | 'orgId'>) {
        const id = ulid()
        await db.insert(s.uploadBatches).values({ ...v, id, orgId })
        return id
      },
      get: async (id: string) =>
        (await db.select().from(s.uploadBatches).where(and(eq(s.uploadBatches.orgId, orgId), eq(s.uploadBatches.id, id))))[0],
      list: () =>
        db.select().from(s.uploadBatches).where(eq(s.uploadBatches.orgId, orgId)).orderBy(desc(s.uploadBatches.createdAt)),
    },

    images: {
      async create(v: Omit<typeof s.images.$inferInsert, 'orgId'>) {
        await db.insert(s.images).values({ ...v, orgId })
      },
      get: async (id: string) =>
        (await db.select().from(s.images).where(and(eq(s.images.orgId, orgId), eq(s.images.id, id))))[0],
      listByBatch: (batchId: string) =>
        db.select().from(s.images).where(and(eq(s.images.orgId, orgId), eq(s.images.batchId, batchId))),
      async update(id: string, patch: Partial<typeof s.images.$inferInsert>) {
        const { orgId: _o, id: _i, ...safe } = patch
        await db.update(s.images).set(safe).where(and(eq(s.images.orgId, orgId), eq(s.images.id, id)))
      },
      expired: (nowMs: number) =>
        db
          .select()
          .from(s.images)
          .where(and(eq(s.images.orgId, orgId), isNull(s.images.deletedAt), sql`${s.images.expiresAt} < ${nowMs}`)),
    },

    contacts: {
      async insertMany(rows: Omit<typeof s.contacts.$inferInsert, 'orgId'>[]) {
        for (const r of rows) await db.insert(s.contacts).values({ ...r, orgId })
      },
      get: async (id: string) =>
        (await db.select().from(s.contacts).where(and(eq(s.contacts.orgId, orgId), eq(s.contacts.id, id), isNull(s.contacts.deletedAt))))[0],
      list(f: { status?: string; batchId?: string; q?: string; minConfidence?: number; limit?: number; offset?: number } = {}) {
        const conds: (SQL | undefined)[] = [eq(s.contacts.orgId, orgId), isNull(s.contacts.deletedAt)]
        if (f.status) conds.push(eq(s.contacts.status, f.status))
        if (f.batchId) conds.push(eq(s.contacts.batchId, f.batchId))
        if (f.minConfidence != null) conds.push(sql`${s.contacts.confidence} >= ${f.minConfidence}`)
        if (f.q) {
          const p = `%${f.q.replace(/[%_]/g, '')}%`
          conds.push(or(like(s.contacts.fullName, p), like(s.contacts.company, p), like(s.contacts.email, p), like(s.contacts.jobTitle, p)))
        }
        return db
          .select()
          .from(s.contacts)
          .where(and(...conds))
          .orderBy(desc(s.contacts.createdAt))
          .limit(f.limit ?? 200)
          .offset(f.offset ?? 0)
      },
      async update(id: string, patch: Partial<typeof s.contacts.$inferInsert>) {
        const { orgId: _o, id: _i, ...safe } = patch
        await db
          .update(s.contacts)
          .set({ ...safe, updatedAt: new Date() })
          .where(and(eq(s.contacts.orgId, orgId), eq(s.contacts.id, id)))
      },
      async bulkStatus(ids: string[], status: string) {
        if (!ids.length) return
        await db
          .update(s.contacts)
          .set({ status, updatedAt: new Date() })
          .where(and(eq(s.contacts.orgId, orgId), inArray(s.contacts.id, ids)))
      },
      async deleteUneditedForImage(imageId: string) {
        await db
          .delete(s.contacts)
          .where(and(eq(s.contacts.orgId, orgId), eq(s.contacts.imageId, imageId), isNull(s.contacts.userEditedJson)))
      },
      async softDelete(id: string) {
        await db
          .update(s.contacts)
          .set({ deletedAt: new Date() })
          .where(and(eq(s.contacts.orgId, orgId), eq(s.contacts.id, id)))
      },
    },

    candidates: {
      forContact: (contactId: string) =>
        db
          .select()
          .from(s.candidates)
          .where(and(eq(s.candidates.orgId, orgId), eq(s.candidates.contactId, contactId)))
          .orderBy(s.candidates.rank),
    },

    audit: {
      async log(e: { actorUserId?: string | null; action: string; entityType?: string; entityId?: string; meta?: unknown }) {
        await db.insert(s.auditLog).values({
          id: ulid(),
          orgId,
          actorUserId: e.actorUserId ?? null,
          action: e.action,
          entityType: e.entityType,
          entityId: e.entityId,
          metaJson: e.meta ? JSON.stringify(e.meta) : null,
        })
      },
      list: (limit = 100) =>
        db.select().from(s.auditLog).where(eq(s.auditLog.orgId, orgId)).orderBy(desc(s.auditLog.createdAt)).limit(limit),
    },

    usage: {
      async record(kind: string, quantity = 1) {
        const p = period()
        await db.insert(s.usageEvents).values({ id: ulid(), orgId, kind, quantity, period: p })
        await db
          .insert(s.usageMonthly)
          .values({ orgId, period: p, kind, total: quantity })
          .onConflictDoUpdate({
            target: [s.usageMonthly.orgId, s.usageMonthly.period, s.usageMonthly.kind],
            set: { total: sql`${s.usageMonthly.total} + ${quantity}` },
          })
      },
      month: () => db.select().from(s.usageMonthly).where(and(eq(s.usageMonthly.orgId, orgId), eq(s.usageMonthly.period, period()))),
    },
  }
}

export type TenantDb = ReturnType<typeof tenantDb>
