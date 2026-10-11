import { z } from 'zod'

export const LawfulBasis = z.enum(['consent', 'legitimate_interests', 'contract'])
export const ContactStatus = z.enum(['new', 'approved', 'skipped', 'sent', 'replied'])

export const BatchCreate = z.object({
  eventName: z.string().trim().max(120).optional(),
  lawfulBasis: LawfulBasis,
  consentNotes: z.string().trim().max(1000).optional(),
  sourceDescription: z.string().trim().max(500).optional(),
})

const nullableStr = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => (v ? v : null))

export const ContactPatch = z
  .object({
    fullName: nullableStr(200),
    company: nullableStr(200),
    jobTitle: nullableStr(200),
    email: z.string().trim().email().max(254).nullish().or(z.literal('')).transform((v) => v || null),
    phone: nullableStr(40),
    website: nullableStr(300),
    status: ContactStatus,
  })
  .partial()
  .strict()

export const BulkStatus = z.object({ ids: z.array(z.string()).min(1).max(500), status: ContactStatus })

export const ContactQuery = z.object({
  status: ContactStatus.optional(),
  batchId: z.string().optional(),
  q: z.string().max(100).optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

// Shape returned by the vision model. One image may hold many people.
export const ExtractedContact = z.object({
  full_name: z.string().nullish(),
  company: z.string().nullish(),
  job_title: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  website: z.string().nullish(),
  handles: z.record(z.string(), z.string()).nullish(),
  confidence: z.number().min(0).max(1).catch(0.5),
  bounding_box: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).nullish(),
})
export const ExtractionResult = z.object({ contacts: z.array(ExtractedContact).max(100) })
export type ExtractedContact = z.infer<typeof ExtractedContact>
