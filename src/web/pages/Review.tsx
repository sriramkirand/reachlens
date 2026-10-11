import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Contact } from '@/lib/api'
import { Badge, Button, Input, Select } from '@/components/ui'

const STATUSES = ['new', 'approved', 'skipped', 'sent', 'replied']
type Field = 'fullName' | 'company' | 'jobTitle' | 'email' | 'phone'
const FIELDS: [Field, string][] = [['fullName', 'Name'], ['company', 'Company'], ['jobTitle', 'Title'], ['email', 'Email'], ['phone', 'Phone']]

function Cell({ value, onSave }: { value: string | null; onSave: (v: string) => void }) {
  const [v, setV] = useState(value ?? '')
  return <Input className="min-w-32 border-transparent px-1 py-1 hover:border-[var(--border)]" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (value ?? '') && onSave(v)} />
}

export function Review() {
  const [sp] = useSearchParams()
  const batchId = sp.get('batch') ?? undefined
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const qc = useQueryClient()
  const key = ['contacts', batchId, q, status]
  const { data = [], error } = useQuery({
    queryKey: key,
    queryFn: () => api<Contact[]>(`/contacts?${new URLSearchParams({ ...(batchId && { batchId }), ...(q && { q }), ...(status && { status }) })}`),
    refetchInterval: 3000, // extraction is async; poll until rows land
  })
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
  const bulk = useMutation({
    mutationFn: (s: string) => api('/contacts/bulk-status', { method: 'POST', body: JSON.stringify({ ids: [...sel], status: s }) }),
    onSuccess: () => { setSel(new Set()); qc.invalidateQueries({ queryKey: ['contacts'] }) },
  })
  const all = useMemo(() => data.length > 0 && data.every((c) => sel.has(c.id)), [data, sel])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-64" placeholder="Search name, company, email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        {sel.size > 0 && (
          <>
            <span className="text-sm">{sel.size} selected</span>
            <Button variant="outline" onClick={() => bulk.mutate('approved')}>Approve</Button>
            <Button variant="outline" onClick={() => bulk.mutate('skipped')}>Skip</Button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--card)] text-left">
            <tr>
              <th className="p-2"><input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(data.map((c) => c.id)))} /></th>
              <th className="p-2">Source</th>
              {FIELDS.map(([, l]) => <th key={l} className="p-2">{l}</th>)}
              <th className="p-2">Conf.</th><th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-t border-[var(--border)]">
                <td className="p-2"><input type="checkbox" checked={sel.has(c.id)} onChange={() => setSel((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })} /></td>
                <td className="p-2"><img src={`/api/images/${c.imageId}/file`} loading="lazy" className="h-10 w-14 rounded object-cover" alt="" /></td>
                {FIELDS.map(([f]) => <td key={f} className="p-1"><Cell value={c[f]} onSave={(v) => patch.mutate({ id: c.id, body: { [f]: v } })} /></td>)}
                <td className="p-2">{c.confidence != null && <Badge tone={c.confidence < 0.6 ? 'warn' : 'ok'}>{Math.round(c.confidence * 100)}%</Badge>}</td>
                <td className="p-2">
                  <Select value={c.status} onChange={(e) => patch.mutate({ id: c.id, body: { status: e.target.value } })}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </td>
              </tr>
            ))}
            {!data.length && <tr><td colSpan={9} className="p-6 text-center text-[var(--muted)]">No contacts yet. Extraction usually completes within a minute of upload.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
