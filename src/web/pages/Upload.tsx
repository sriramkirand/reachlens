import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button, Card, Input, Select } from '@/components/ui'

export function Upload() {
  const nav = useNavigate()
  const [basis, setBasis] = useState('legitimate_interests')
  const [event, setEvent] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const add = (list: FileList | null) => list && setFiles((f) => [...f, ...Array.from(list).filter((x) => x.type.startsWith('image/'))])

  const go = async () => {
    setBusy(true); setErr(''); setProgress(0)
    try {
      const { id } = await api<{ id: string }>('/batches', { method: 'POST', body: JSON.stringify({ eventName: event || undefined, lawfulBasis: basis, consentNotes: notes || undefined }) })
      let done = 0
      const queue = [...files]
      await Promise.all(Array.from({ length: 5 }, async () => {
        for (let f = queue.shift(); f; f = queue.shift()) {
          const fd = new FormData(); fd.append('file', f)
          await api(`/batches/${id}/images`, { method: 'POST', body: fd })
          setProgress(++done)
        }
      }))
      nav(`/review?batch=${id}`)
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-semibold">1. Batch details</h2>
        <Input placeholder="Event name (used for {event} later)" value={event} onChange={(e) => setEvent(e.target.value)} />
        <label className="block text-sm">Lawful basis for processing these people's data
          <Select className="mt-1 w-full" value={basis} onChange={(e) => setBasis(e.target.value)}>
            <option value="consent">Consent</option>
            <option value="legitimate_interests">Legitimate interests</option>
            <option value="contract">Contract</option>
          </Select>
        </label>
        <Input placeholder="Notes: how/where this data was collected" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Card>
      <Card
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files) }}
        className="cursor-pointer border-dashed py-12 text-center"
        onClick={() => input.current?.click()}
      >
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
        <p className="font-medium">Drop photos here or click to choose</p>
        <p className="text-sm text-[var(--muted)]">{files.length} selected · JPG, PNG, WebP, HEIC up to 10 MB each</p>
      </Card>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <Button disabled={!files.length || busy} onClick={go}>
        {busy ? `Uploading ${progress}/${files.length}…` : `Upload ${files.length} image${files.length === 1 ? '' : 's'}`}
      </Button>
    </div>
  )
}
