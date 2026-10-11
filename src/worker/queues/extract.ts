import { ulid } from 'ulid'
import type { Env, ExtractJob } from '../env'
import { tenantDb } from '../db/tenant'
import { extractContacts } from '../services/vision/extract'
import { log } from '../lib/logger'

export async function handleExtractBatch(batch: MessageBatch<ExtractJob>, env: Env) {
  for (const msg of batch.messages) {
    const { orgId, imageId } = msg.body
    const tdb = tenantDb(env.DB, orgId)
    try {
      const img = await tdb.images.get(imageId)
      if (!img || img.deletedAt) { msg.ack(); continue }
      await tdb.images.update(imageId, { status: 'extracting', attempts: img.attempts + 1 })
      const obj = await env.IMAGES.get(img.r2Key)
      if (!obj) throw new Error('R2 object missing')
      const { contacts, provider } = await extractContacts(env, await obj.arrayBuffer(), img.mime)

      // Re-runs replace prior un-edited output for this image (idempotent on retry).
      await tdb.contacts.deleteUneditedForImage(imageId)
      await tdb.contacts.insertMany(
        contacts.map((c) => ({
          id: ulid(),
          batchId: img.batchId,
          imageId,
          fullName: c.full_name || null,
          company: c.company || null,
          jobTitle: c.job_title || null,
          email: c.email || null,
          phone: c.phone || null,
          website: c.website || null,
          handlesJson: c.handles ? JSON.stringify(c.handles) : null,
          confidence: c.confidence,
          bboxJson: c.bounding_box ? JSON.stringify(c.bounding_box) : null,
        })),
      )
      await tdb.images.update(imageId, { status: 'done', error: null })
      await tdb.usage.record('image_processed')
      log('info', 'extracted', { orgId, imageId, provider, n: contacts.length })
      msg.ack()
    } catch (e) {
      log('error', 'extract failed', { orgId, imageId, err: String(e), attempt: msg.attempts })
      await tdb.images.update(imageId, { status: msg.attempts >= 3 ? 'failed' : 'queued', error: String(e).slice(0, 300) })
      msg.retry({ delaySeconds: 5 * msg.attempts })
    }
  }
}
