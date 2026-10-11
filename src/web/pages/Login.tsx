import { useState } from 'react'
import { authClient } from '@/lib/auth'
import { Button, Card, Input } from '@/components/ui'

export function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = mode === 'in' ? await authClient.signIn.email(f) : await authClient.signUp.email(f)
    if (r.error) setErr(r.error.message ?? 'Failed')
  }
  return (
    <div className="mx-auto mt-24 max-w-sm px-4">
      <Card>
        <h1 className="mb-4 text-xl font-semibold">{mode === 'in' ? 'Sign in' : 'Create account'}</h1>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'up' && <Input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />}
          <Input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <Input type="password" placeholder="Password (10+ chars)" minLength={10} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          {err && <p className="text-sm text-red-500">{err}</p>}
          <Button className="w-full">{mode === 'in' ? 'Sign in' : 'Sign up'}</Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={() => authClient.signIn.social({ provider: 'google' })}>Continue with Google</Button>
        <button className="mt-4 text-sm underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Need an account?' : 'Have an account?'}
        </button>
      </Card>
    </div>
  )
}
