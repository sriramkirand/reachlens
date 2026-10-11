import type { Env } from '../env'
import { tenantDb } from '../db/tenant'
import { log } from '../lib/logger'

/** Daily cron: delete R2 objects past each org's retention window. System job; still goes through tenantDb per org. */
export async function sweepRetention(env: Env) {
  const { results } = await env.DB.prepare('SELECT org_id FROM org_settings').all<{ org_id: string }>()
  for (const { org_id } of results) {
    const tdb = tenantDb(env.DB, org_id)
    for (const img of await tdb.images.expired(Date.now())) {
      await env.IMAGES.delete(img.r2Key)
      await tdb.images.update(img.id, { deletedAt: new Date() })
      await tdb.audit.log({ action: 'image.retention_delete', entityType: 'image', entityId: img.id })
      log('info', 'retention delete', { orgId: org_id, imageId: img.id })
    }
  }
}
