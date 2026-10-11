import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { ulid } from 'ulid'
import { BatchCreate } from '../../shared/schemas'
import { requireTenant, type AppEnv } from '../middleware/tenant'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }

export const uploads = new Hono<AppEnv>()
  .use(requireTenant)
  .get('/batches', async (c) => c.json(await c.get('tdb').batches.list()))
  .post('/batches', zValidator('json', BatchCreate), async (c) => {
    const tdb = c.get('tdb')
    const id = await tdb.batches.create({ ...c.req.valid('json'), createdBy: c.get('userId') })
    await tdb.audit.log({ actorUserId: c.get('userId'), action: 'batch.create', entityType: 'batch', entityId: id, meta: { lawfulBasis: c.req.valid('json').lawfulBasis } })
    return c.json({ id }, 201)
  })
  .get('/batches/:id/images', async (c) => {
    const tdb = c.get('tdb')
    if (!(await tdb.batches.get(c.req.param('id')))) throw new HTTPException(404)
    return c.json(await tdb.images.listByBatch(c.req.param('id')))
  })
  // One image per request; the client uploads several in parallel.
  .post('/batches/:id/images', async (c) => {
    const tdb = c.get('tdb')
    const orgId = c.get('orgId')
    const batch = await tdb.batches.get(c.req.param('id'))
    if (!batch) throw new HTTPException(404, { message: 'Batch not found' })

    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw new HTTPException(400, { message: 'file field required' })
    if (!ALLOWED.has(file.type)) throw new HTTPException(415, { message: `Unsupported type ${file.type}` })
    if (file.size > Number(c.env.MAX_UPLOAD_BYTES)) throw new HTTPException(413, { message: 'Image too large' })

    const id = ulid()
    const r2Key = `orgs/${orgId}/${batch.id}/${id}.${EXT[file.type]}`
    await c.env.IMAGES.put(r2Key, file.stream(), { httpMetadata: { contentType: file.type } })
    const { retentionDays } = await tdb.settings.get()
    await tdb.images.create({
      id, batchId: batch.id, r2Key, mime: file.type, bytes: file.size, status: 'queued',
      expiresAt: new Date(Date.now() + retentionDays * 86_400_000),
    })
    await c.env.EXTRACT_QUEUE.send({ orgId, imageId: id })
    await tdb.audit.log({ actorUserId: c.get('userId'), action: 'image.upload', entityType: 'image', entityId: id })
    return c.json({ id, status: 'queued' }, 201)
  })
  // Stream an image back, scoped to the caller's org (used for thumbnails).
  .get('/images/:id/file', async (c) => {
    const img = await c.get('tdb').images.get(c.req.param('id'))
    if (!img || img.deletedAt) throw new HTTPException(404)
    const obj = await c.env.IMAGES.get(img.r2Key)
    if (!obj) throw new HTTPException(404)
    return new Response(obj.body, { headers: { 'content-type': img.mime, 'cache-control': 'private, max-age=3600' } })
  })
