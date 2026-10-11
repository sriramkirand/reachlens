import { describe, expect, it } from 'vitest'

// Guard: route/queue/service code must not import app tables or touch D1 directly.
const files = import.meta.glob('../src/worker/{routes,queues,services}/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('data access discipline', () => {
  for (const [path, src] of Object.entries(files)) {
    it(`${path} uses tenantDb only`, () => {
      expect(src).not.toMatch(/from ['"].*db\/schema/)
      expect(src).not.toMatch(/drizzle-orm\/d1/)
      if (!path.endsWith('retention.ts')) expect(src).not.toMatch(/env\.DB\.prepare/)
    })
  }
})
