import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core'

const ts = (name: string) => integer(name, { mode: 'timestamp_ms' })
const now = () => new Date()

// Every table below carries org_id; access goes through db/tenant.ts only.

export const orgSettings = sqliteTable('org_settings', {
  orgId: text('org_id').primaryKey(),
  retentionDays: integer('retention_days').notNull().default(30),
  dailyLinkedinCap: integer('daily_linkedin_cap').notNull().default(50),
  cooldownSeconds: integer('cooldown_seconds').notNull().default(20),
  emailProvider: text('email_provider').notNull().default('none'),
  emailConfigEnc: text('email_config_enc'),
  plan: text('plan').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: ts('created_at').notNull().$defaultFn(now),
})

export const uploadBatches = sqliteTable(
  'upload_batches',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    createdBy: text('created_by').notNull(),
    eventName: text('event_name'),
    lawfulBasis: text('lawful_basis').notNull(), // consent | legitimate_interests | contract
    consentNotes: text('consent_notes'),
    sourceDescription: text('source_description'),
    createdAt: ts('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('batches_org_idx').on(t.orgId, t.createdAt)],
)

export const images = sqliteTable(
  'images',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    batchId: text('batch_id').notNull(),
    r2Key: text('r2_key').notNull(),
    mime: text('mime').notNull(),
    bytes: integer('bytes').notNull(),
    status: text('status').notNull().default('uploaded'), // uploaded|queued|extracting|done|failed
    error: text('error'),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: ts('expires_at'),
    deletedAt: ts('deleted_at'),
    createdAt: ts('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('images_org_idx').on(t.orgId, t.batchId), index('images_expiry_idx').on(t.expiresAt)],
)

export const contacts = sqliteTable(
  'contacts',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    batchId: text('batch_id').notNull(),
    imageId: text('image_id').notNull(),
    fullName: text('full_name'),
    company: text('company'),
    jobTitle: text('job_title'),
    email: text('email'),
    phone: text('phone'),
    website: text('website'),
    handlesJson: text('handles_json'),
    confidence: real('confidence'),
    bboxJson: text('bbox_json'),
    status: text('status').notNull().default('new'), // new|approved|skipped|sent|replied
    enrichmentStatus: text('enrichment_status').notNull().default('pending'),
    userEditedJson: text('user_edited_json'),
    deletedAt: ts('deleted_at'),
    createdAt: ts('created_at').notNull().$defaultFn(now),
    updatedAt: ts('updated_at').notNull().$defaultFn(now),
  },
  (t) => [index('contacts_org_idx').on(t.orgId, t.status), index('contacts_batch_idx').on(t.orgId, t.batchId)],
)

export const candidates = sqliteTable(
  'candidates',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    contactId: text('contact_id').notNull(),
    url: text('url').notNull(),
    title: text('title'),
    snippet: text('snippet'),
    score: real('score').notNull(),
    reasoning: text('reasoning').notNull(),
    lowConfidence: integer('low_confidence', { mode: 'boolean' }).notNull().default(true),
    selected: integer('selected', { mode: 'boolean' }).notNull().default(false),
    rank: integer('rank').notNull(),
  },
  (t) => [index('candidates_contact_idx').on(t.orgId, t.contactId)],
)

export const templates = sqliteTable(
  'templates',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    name: text('name').notNull(),
    channel: text('channel').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('templates_org_idx').on(t.orgId, t.channel)],
)

export const templateVariants = sqliteTable(
  'template_variants',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    templateId: text('template_id').notNull(),
    label: text('label').notNull().default('A'),
    subject: text('subject'),
    body: text('body').notNull(),
    maxChars: integer('max_chars'),
    weight: integer('weight').notNull().default(1),
  },
  (t) => [index('variants_tpl_idx').on(t.orgId, t.templateId)],
)

export const outreachActions = sqliteTable(
  'outreach_actions',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    contactId: text('contact_id').notNull(),
    channel: text('channel').notNull(),
    variantId: text('variant_id'),
    renderedText: text('rendered_text'),
    targetUrl: text('target_url'),
    status: text('status').notNull().default('drafted'), // drafted|opened|sent|replied
    confirmedBy: text('confirmed_by'),
    confirmedAt: ts('confirmed_at'),
    createdAt: ts('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('actions_org_idx').on(t.orgId, t.contactId, t.channel)],
)

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    actorUserId: text('actor_user_id'),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    metaJson: text('meta_json'),
    ipHash: text('ip_hash'),
    createdAt: ts('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('audit_org_idx').on(t.orgId, t.createdAt)],
)

export const usageEvents = sqliteTable(
  'usage_events',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    kind: text('kind').notNull(), // image_processed|search_run|llm_call|email_sent
    quantity: integer('quantity').notNull().default(1),
    period: text('period').notNull(), // YYYY-MM
    createdAt: ts('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('usage_org_idx').on(t.orgId, t.period)],
)

export const usageMonthly = sqliteTable(
  'usage_monthly',
  {
    orgId: text('org_id').notNull(),
    period: text('period').notNull(),
    kind: text('kind').notNull(),
    total: integer('total').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.period, t.kind] })],
)
