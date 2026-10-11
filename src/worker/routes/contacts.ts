import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { BulkStatus, ContactPatch, ContactQuery } from '../../shared/schemas'
import { requireTenant, type AppEnv } from '../middleware/tenant'

export const contacts = new Hono<AppEnv>()
  .use(requireTenant)
  .get('/', zValidator('query', ContactQuery), async (c) => c.json(await c.get('tdb').contacts.list(c.req.valid('query'))))
  .patch('/:id', zValidator('json', ContactPatch), async (c) => {
    const tdb = c.get('tdb')
    const id = c.req.param('id')
    const existing = await tdb.contacts.get(id)
    if (!existing) throw new HTTPException(404)
    const patch = c.req.valid('json')
    const edited = new Set<string>(JSON.parse(existing.userEditedJson ?? '[]'))
    for (const k of Object.keys(patch)) if (k !== 'status') edited.add(k)
    await tdb.contacts.update(id, { ...patch, userEditedJson: edited.size ? JSON.stringify([...edited]) : null })
    await tdb.audit.log({ actorUserId: c.get('userId'), action: 'contact.update', entityType: 'contact', entityId: id, meta: { fields: Object.keys(patch) } })
    return c.json(await tdb.contacts.get(id))
  })
  .post('/bulk-status', zValidator('json', BulkStatus), async (c) => {
    const { ids, status } = c.req.valid('json')
    const tdb = c.get('tdb')
    await tdb.contacts.bulkStatus(ids, status)
    await tdb.audit.log({ actorUserId: c.get('userId'), action: 'contact.bulk_status', meta: { count: ids.length, status } })
    return c.json({ updated: ids.length })
  })
