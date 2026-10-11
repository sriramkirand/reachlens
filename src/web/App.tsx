import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { authClient } from '@/lib/auth'
import { Button } from '@/components/ui'
import { Login } from '@/pages/Login'
import { Onboarding } from '@/pages/Onboarding'
import { Upload } from '@/pages/Upload'
import { Review } from '@/pages/Review'
import { Privacy } from '@/pages/Privacy'

export function App() {
  const { data, isPending } = authClient.useSession()
  if (isPending) return <p className="p-8 text-sm">Loading…</p>
  return (
    <Routes>
      <Route path="/privacy" element={<Privacy />} />
      {!data ? (
        <Route path="*" element={<Login />} />
      ) : !(data.session as any).activeOrganizationId ? (
        <Route path="*" element={<Onboarding />} />
      ) : (
        <Route path="*" element={<Shell />} />
      )}
    </Routes>
  )
}

function Shell() {
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-6 flex items-center gap-4">
        <b className="text-lg">Reachlens</b>
        <Link to="/upload" className="text-sm">Upload</Link>
        <Link to="/review" className="text-sm">Review</Link>
        <Link to="/privacy" className="text-sm">Privacy</Link>
        <Button variant="outline" className="ml-auto" onClick={() => authClient.signOut()}>Sign out</Button>
      </header>
      <Routes>
        <Route path="/upload" element={<Upload />} />
        <Route path="/review" element={<Review />} />
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </div>
  )
}
