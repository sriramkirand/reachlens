import { app } from './app'
import type { Env, ExtractJob } from './env'
import { handleExtractBatch } from './queues/extract'
import { sweepRetention } from './services/retention'

export default {
  fetch: app.fetch,
  queue: (batch: MessageBatch<unknown>, env: Env) => handleExtractBatch(batch as MessageBatch<ExtractJob>, env),
  scheduled: (_e: ScheduledController, env: Env, ctx: ExecutionContext) => { ctx.waitUntil(sweepRetention(env)) },
} satisfies ExportedHandler<Env>
