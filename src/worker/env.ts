export interface Env {
  DB: D1Database
  IMAGES: R2Bucket
  EXTRACT_QUEUE: Queue<ExtractJob>
  ASSETS: Fetcher
  RATE_LIMITER: { limit(opts: { key: string }): Promise<{ success: boolean }> }
  APP_ENV: string
  BETTER_AUTH_URL: string
  MAX_UPLOAD_BYTES: string
  BETTER_AUTH_SECRET: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GROQ_API_KEY?: string
  GROQ_VISION_MODEL?: string
}

export interface ExtractJob {
  orgId: string
  imageId: string
}
