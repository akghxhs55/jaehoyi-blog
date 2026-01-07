import type { NextApiRequest, NextApiResponse } from "next"

// Minimal KV client typing
type KvClient = {
  lrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]>
  rpush(key: string, ...elements: unknown[]): Promise<number>
  del(key: string): Promise<number>
  get<T = unknown>(key: string): Promise<T | null>
  set<T = unknown>(key: string, value: T, opts?: { ex?: number; nx?: boolean }): Promise<unknown>
}

// Try to access Vercel KV if configured; otherwise fall back to in-memory store for local dev
let kvAvailable: boolean | undefined
let kv: KvClient | null = null

async function ensureKv() {
  if (kvAvailable !== undefined) return kv
  try {
    const hasEnv = Boolean(
      process.env.KV_URL ||
      process.env.KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN
    )
    if (!hasEnv) {
      kvAvailable = false
      kv = null
      return kv
    }
    const mod = await import("@vercel/kv")
    kv = (mod as any).kv as KvClient
    kvAvailable = !!kv
  } catch {
    kvAvailable = false
    kv = null
  }
  return kv
}

// Local in-memory fallback (dev only, non-persistent)
const memoryComments = new Map<string, string[]>()

export type CommentData = {
  id: string
  date: number
  author: string
  content: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Cache for 5 minutes, then serve stale for 10 minutes while updating
    // This significantly reduces KV reads during high traffic
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")

    const { slug } = req.query
    if (!slug || typeof slug !== "string") {
      return res.status(400).json({ error: "slug is required" })
    }

    await ensureKv()

    const key = `comments:${slug}`
    let rawComments: unknown[] = []

    try {
      if (kv) {
        rawComments = await kv.lrange(key, 0, -1)
      } else {
        rawComments = memoryComments.get(key) || []
      }
    } catch (e) {
      console.error(e)
      // Return empty if fail
    }

    // Parse JSON
    const comments: CommentData[] = rawComments
      .map((item) => {
        try {
          if (typeof item === "object" && item !== null) return item as CommentData
          if (typeof item === "string") return JSON.parse(item)
          return null
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.date - a.date) // Newest first

    return res.status(200).json(comments)
  }

    // Ensure no caching for mutations
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")

  if (req.method === "POST") {
    const { slug, author, content } = req.body
    if (!slug || typeof slug !== "string" || !content) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    await ensureKv()

    // Rate Limiting: Prevent spam by checking IP (1 comment per 60 seconds)
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
    const ipKey = Array.isArray(ip) ? ip[0] : ip
    const rateLimitKey = `rate_limit:${ipKey}`

    if (kv) {
      try {
        // SET key val EX 60 NX
        // Returns 'OK' (or true/1) if set, null/0 if already exists (rate limited)
        // This avoids a separate GET (Read) operation
        const success = await kv.set(rateLimitKey, "1", { ex: 60, nx: true })
        if (!success) {
          return res.status(429).json({ error: "Too many requests. Please try again later." })
        }
      } catch (e) {
        // Ignore errors
      }
    }

    const newComment: CommentData = {
      id: Math.random().toString(36).slice(2),
      date: Date.now(),
      author: (author || "Anonymous").slice(0, 50), // Limit length
      content: (content || "").slice(0, 1000), // Limit length
    }

    const key = `comments:${slug}`
    const val = JSON.stringify(newComment)

    try {
      if (kv) {
        await kv.rpush(key, val)
      } else {
        const list = memoryComments.get(key) || []
        list.push(val)
        memoryComments.set(key, list)
      }
    } catch (e) {
      return res.status(500).json({ error: "Failed to save comment" })
    }

    return res.status(200).json(newComment)
  }

  return res.status(405).json({ error: "Method Not Allowed" })
}

