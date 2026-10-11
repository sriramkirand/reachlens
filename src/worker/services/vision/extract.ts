import { ExtractionResult, type ExtractedContact } from '../../../shared/schemas'
import type { Env } from '../../env'
import { log } from '../../lib/logger'

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

async function gemini(env: Env, buf: ArrayBuffer, mime: string): Promise<ExtractedContact[]> {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: b64(buf) } }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    },
  )
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as any
  return parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
}

const VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct'

async function workersAi(env: Env, buf: ArrayBuffer, mime: string): Promise<ExtractedContact[]> {
  const run = (input: object) => env.AI.run(VISION_MODEL as any, input as any) as Promise<any>
  // Error 5016 means Meta's model licence hasn't been accepted on this Cloudflare account yet.
  // That is a legal acceptance for the account owner to make, so it is deliberately not automated.
  const out = await run(visionInput(buf, mime))
  return parse(typeof out === 'string' ? out : (out.response ?? ''))
}

function visionInput(buf: ArrayBuffer, mime: string) {
  return {
    messages: [
      { role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: `data:${mime};base64,${b64(buf)}` } }] },
    ],
    max_tokens: 2048,
  }
}

/** Gemini Flash first, Workers AI as fallback. */
export async function extractContacts(env: Env, buf: ArrayBuffer, mime: string) {
  if (env.GEMINI_API_KEY) {
    try {
      return { contacts: await gemini(env, buf, mime), provider: 'gemini' as const }
    } catch (e) {
      log('warn', 'gemini extraction failed, falling back', { err: String(e) })
    }
  }
  return { contacts: await workersAi(env, buf, mime), provider: 'workers-ai' as const }
}
