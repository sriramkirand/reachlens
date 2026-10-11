import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import { tenantDb } from '../src/worker/db/tenant'

const A = 'org_A'
const B = 'org_B'
let a: ReturnType<typeof tenantDb>
let b: ReturnType<typeof tenantDb>
let aBatch: string, aImage: string, aContact: string

beforeAll(async () => {
  a = tenantDb(env.DB, A)
  b = tenantDb(env.DB, B)
  aBatch = await a.batches.create({ createdBy: 'u1', lawfulBasis: 'consent' })
  aImage = 'img_a1'
  await a.images.create({ id: aImage, batchId: aBatch, r2Key: 'orgs/org_A/x.jpg', mime: 'image/jpeg', bytes: 10 })
  aContact = 'c_a1'
  await a.contacts.insertMany([{ id: aContact, batchId: aBatch, imageId: aImage, fullName: 'Ada Lovelace', company: 'Analytical', status: 'new' }])
  await a.audit.log({ action: 'x' })
  await a.usage.record('image_processed')
  await b.batches.create({ createdBy: 'u2', lawfulBasis: 'consent' })
})

describe('tenant isolation', () => {
  it('org B cannot read org A rows by id or list', async () => {
    expect(await b.batches.get(aBatch)).toBeUndefined()
    expect(await b.images.get(aImage)).toBeUndefined()
    expect(await b.contacts.get(aContact)).toBeUndefined()
    expect(await b.contacts.list()).toHaveLength(0)
    expect(await b.contacts.list({ q: 'Ada' })).toHaveLength(0)
    expect(await b.images.listByBatch(aBatch)).toHaveLength(0)
    expect((await b.batches.list()).every((r) => r.orgId === B)).toBe(true)
    expect(await b.audit.list()).toHaveLength(0)
    expect(await b.usage.month()).toHaveLength(0)
  })

  it('org B cannot update, bulk-update, or delete org A rows', async () => {
    await b.contacts.update(aContact, { fullName: 'Hacked', status: 'sent' })
    await b.contacts.bulkStatus([aContact], 'skipped')
    await b.contacts.softDelete(aContact)
    await b.images.update(aImage, { status: 'failed' })
    const c = await a.contacts.get(aContact)
    expect(c?.fullName).toBe('Ada Lovelace')
    expect(c?.status).toBe('new')
    expect((await a.images.get(aImage))?.status).toBe('uploaded')
  })

  it('cannot spoof org_id through a patch', async () => {
    await a.contacts.update(aContact, { orgId: B, company: 'Moved' } as any)
    expect((await a.contacts.get(aContact))?.orgId).toBe(A)
    expect(await b.contacts.get(aContact)).toBeUndefined()
  })

  it('inserts are always stamped with the caller org', async () => {
    await b.contacts.insertMany([{ id: 'c_b1', batchId: 'bb', imageId: 'ii', orgId: A } as any])
    expect(await a.contacts.get('c_b1')).toBeUndefined()
    expect((await b.contacts.get('c_b1'))?.orgId).toBe(B)
  })

  it('unedited-contact cleanup is org scoped', async () => {
    await b.contacts.deleteUneditedForImage(aImage)
    expect(await a.contacts.get(aContact)).toBeDefined()
  })

  it('rejects an empty org id', () => {
    expect(() => tenantDb(env.DB, '')).toThrow()
  })
})
