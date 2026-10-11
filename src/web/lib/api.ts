export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: 'include', ...init, headers: init?.body instanceof FormData ? init.headers : { 'content-type': 'application/json', ...init?.headers } })
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as any).error ?? res.statusText)
  return res.json() as Promise<T>
}
export type Contact = {
  id: string; batchId: string; imageId: string; fullName: string | null; company: string | null; jobTitle: string | null
  email: string | null; phone: string | null; website: string | null; confidence: number | null; status: string
}
