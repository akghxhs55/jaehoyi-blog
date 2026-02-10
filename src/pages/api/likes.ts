import type { NextApiRequest, NextApiResponse } from "next"
import { getCookie, setCookie } from "cookies-next"

// Minimal KV client typing used by this file
// (only the methods actually used below)
type KvClient = {
  get<T = unknown>(key: string): Promise<T | null>
  set<T = unknown>(key: string, value: T, opts?: { ex?: number }): Promise<unknown>
  incr(key: string): Promise<number>
  decr(key: string): Promise<number>
  sadd(key: string, ...members: string[]): Promise<number>
  srem(key: string, ...members: string[]): Promise<number>
  sismember(key: string, member: string): Promise<number | boolean>
  mget?: (...keys: string[]) => Promise<any[]>
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
    const { Redis } = await import("@upstash/redis")
    kv = new Redis({
      url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
    }) as KvClient
    kvAvailable = !!kv
  } catch {
    kvAvailable = false
    kv = null
  }
  return kv
}

// Local in-memory fallback (dev only, non-persistent)
const memoryCounts = new Map<string, number>()
const memoryLiked = new Map<string, Set<string>>()

function getUid(req: NextApiRequest, res: NextApiResponse): string {
  let uid = (getCookie("lid", { req, res }) as string) || ""
  if (!uid) {
    // Generate a simple UID
    uid = (global as any).crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
    // 2 years expiry
    const maxAge = 60 * 60 * 24 * 365 * 2
    setCookie("lid", uid, {
      req,
      res,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge,
      secure: process.env.NODE_ENV === "production",
    })
  }
  return uid
}

function normalizeSlugs(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String).map((s) => s.trim()).filter(Boolean)
  const str = String(raw)
  if (str.includes(",")) return str.split(",").map((s) => s.trim()).filter(Boolean)
  return [str.trim()].filter(Boolean)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store")

  if (req.method === "GET") {
    const slugs = normalizeSlugs(req.query.slug || (req.query.slugs as any))
    if (slugs.length === 0) return res.status(400).json({ error: "slug is required" })

    const lite = String(req.query.lite || "").toLowerCase()
    const isLite = lite === "1" || lite === "true"

    await ensureKv()

    // Single slug → { slug, likes, liked }
    if (slugs.length === 1) {
      const slug = slugs[0]
      const keyCount = `likes:count:${slug}`
      let likes = 0
      try {
        if (kv) likes = (await kv.get<number>(keyCount)) || 0
        else likes = memoryCounts.get(keyCount) || 0
      } catch {
        likes = 0
      }

      if (isLite) {
        // Lite mode: do not touch user membership (saves a KV op)
        return res.status(200).json({ slug, likes, liked: false })
      }

      // Determine if current user already liked
      const uid = getUid(req, res)
      let liked = false
      try {
        if (kv) {
          liked = !!(await kv.sismember(`likes:users:${slug}`, uid))
        } else {
          const set = memoryLiked.get(slug)
          liked = !!set && set.has(uid)
        }
      } catch {
        liked = false
      }

      return res.status(200).json({ slug, likes, liked })
    }

    // Multiple slugs → { counts: Record<slug, number> }
    const counts: Record<string, number> = {}
    for (const slug of slugs) {
      const keyCount = `likes:count:${slug}`
      try {
        if (kv) counts[slug] = (await kv.get<number>(keyCount)) || 0
        else counts[slug] = memoryCounts.get(keyCount) || 0
      } catch {
        counts[slug] = 0
      }
    }
    return res.status(200).json({ counts })
  }

  if (req.method === "POST") {
    const { slug, nextLiked, clientDecides } = (req.body || {}) as { slug?: string; nextLiked?: boolean; clientDecides?: boolean }
    if (!slug || typeof slug !== "string")
      return res.status(400).json({ error: "slug is required" })

    await ensureKv()

    // In production, require KV to be available to guarantee persistence
    if (process.env.NODE_ENV === "production" && !kv) {
      return res.status(503).json({ error: "Service unavailable: KV not configured" })
    }

    const countKey = `likes:count:${slug}`
    const usersKey = `likes:users:${slug}`

    let likes = 0
    let liked = false

    const useLiteToggle = !!clientDecides && typeof nextLiked === "boolean"

    try {
      if (kv) {
        if (useLiteToggle) {
          // Client decides desired state → single counter op, no set membership ops
          if (nextLiked) {
            likes = await kv.incr(countKey)
          } else {
            likes = await kv.decr(countKey)
            if (likes < 0) {
              await kv.set(countKey, 0)
              likes = 0
            }
          }
          liked = !!nextLiked
        } else {
          // Full server-side membership check (legacy mode)
          const uid = getUid(req, res)
          const isMember = await kv.sismember(usersKey, uid)
          if (isMember) {
            await kv.srem(usersKey, uid)
            likes = await kv.decr(countKey)
            if (likes < 0) {
              await kv.set(countKey, 0)
              likes = 0
            }
            liked = false
          } else {
            await kv.sadd(usersKey, uid)
            likes = await kv.incr(countKey)
            liked = true
          }
        }
      } else {
        // In-memory fallback for local dev
        const keyCount = countKey
        const prev = memoryCounts.get(keyCount) || 0
        if (useLiteToggle) {
          likes = Math.max(0, nextLiked ? prev + 1 : prev - 1)
          memoryCounts.set(keyCount, likes)
          liked = !!nextLiked
        } else {
          const uid = getUid(req, res)
          const set = memoryLiked.get(slug) || new Set<string>()
          if (set.has(uid)) {
            set.delete(uid)
            memoryLiked.set(slug, set)
            likes = Math.max(0, prev - 1)
            memoryCounts.set(keyCount, likes)
            liked = false
          } else {
            set.add(uid)
            memoryLiked.set(slug, set)
            likes = prev + 1
            memoryCounts.set(keyCount, likes)
            liked = true
          }
        }
      }
    } catch (e) {
      return res.status(500).json({ error: "failed to update likes" })
    }

    return res.status(200).json({ slug, likes, liked })
  }

  return res.status(405).json({ error: "Method Not Allowed" })
}
