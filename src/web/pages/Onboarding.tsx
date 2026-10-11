import { useState } from 'react'
import { authClient } from '@/lib/auth'
import { Button, Card, Input } from '@/components/ui'

export function Onboarding() {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6)
    const r = await authClient.organization.create({ name, slug })
    if (r.error) return setErr(r.error.message ?? 'Failed')
    await authClient.organization.setActive({ organizationId: r.data!.id })
    location.reload()
  }
  return (
    <div className="mx-auto mt-24 max-w-sm px-4">
      <Card>
        <h1 className="mb-1 text-xl font-semibold">Name your organisation</h1>
        <p className="mb-4 text-sm text-[var(--muted)]">Your contacts and images are private to this organisation.</p>
        <form onSubmit={create} className="space-y-3">
          <Input placeholder="Acme Events Ltd" value={name} onChange={(e) => setName(e.target.value)} required />
          {err && <p className="text-sm text-red-500">{err}</p>}
          <Button className="w-full">Create</Button>
        </form>
      </Card>
    </div>
  )
}
