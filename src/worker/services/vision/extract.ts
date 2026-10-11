import { ExtractionResult, type ExtractedContact } from '../../../shared/schemas'
import type { Env } from '../../env'

const PROMPT = `You extract contact details of people from an image (name badge, business card, attendee list, slide or screenshot).
Return ONLY JSON: {"contacts":[{"full_name","company","job_title","email","phone","website","handles":{"linkedin"|"instagram"|"x"|"whatsapp":string},"confidence":0-1,"bounding_box":{"x","y","w","h"} normalised 0-1}]}.
Use null for any field not clearly visible. Never invent values. One entry per person. confidence reflects legibility and completeness.`

function b64(buf: ArrayBuffer) {
  let s = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function parse(text: string): ExtractedContact[] {
  const json = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  const start = json.indexOf('{')
  const end = json.lastIndexOf('}')
  const parsed = ExtractionResult.parse(JSON.parse(json.slice(start, end + 1)))
  return parsed.contacts
}

const DEFAULT_MODEL = 'qwen/qwen3.8-27b' // override with GROQ_VISION_MODEL; must be a Groq model that accepts images

/** Vision extraction via Groq's OpenAI-compatible API. */
export async function extractContacts(env: Env, buf: ArrayBuffer, mime: string) {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: env.GROQ_VISION_MODEL || DEFAULT_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: `data:${mime};base64,${b64(buf)}` } }] },
      ],
    }),
  })
  if (!res.ok) throw new Error(`groq ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = (await res.json()) as any
  return { contacts: parse(data.choices?.[0]?.message?.content ?? ''), provider: 'groq' as const }
}
