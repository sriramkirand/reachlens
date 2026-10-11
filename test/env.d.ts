/// <reference types="vite/client" />
declare module 'cloudflare:test' {
  export const env: import('../src/worker/env').Env & { TEST_MIGRATIONS: unknown }
  export function applyD1Migrations(db: D1Database, migrations: unknown): Promise<void>
}
