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
    const { slug } = (req.body || {}) as { slug?: string }
    if (!slug || typeof slug !== "string")
      return res.status(400).json({ error: "slug is required" })

    await ensureKv()

    // In production, require KV to be available to guarantee single-like correctness.
    if (process.env.NODE_ENV === "production" && !kv) {
      return res.status(503).json({ error: "Service unavailable: KV not configured" })
    }

    const uid = getUid(req, res)

    const usersKey = `likes:users:${slug}`
    const countKey = `likes:count:${slug}`

    let likes = 0
    let liked = false
    try {
      if (kv) {
        const isMember = await kv.sismember(usersKey, uid)
        if (isMember) {
          // Unlike: remove and decrement (floor at 0)
          await kv.srem(usersKey, uid)
          likes = await kv.decr(countKey)
          if (likes < 0) {
            await kv.set(countKey, 0)
            likes = 0
          }
          liked = false
        } else {
          // Like: add and increment
          await kv.sadd(usersKey, uid)
          likes = await kv.incr(countKey)
          liked = true
        }
      } else {
        // In-memory fallback for local dev
        const set = memoryLiked.get(slug) || new Set<string>()
        const keyCount = countKey
        const prev = memoryCounts.get(keyCount) || 0
        if (set.has(uid)) {
          // Unlike
          set.delete(uid)
          memoryLiked.set(slug, set)
          likes = Math.max(0, prev - 1)
          memoryCounts.set(keyCount, likes)
          liked = false
        } else {
          // Like
          set.add(uid)
          memoryLiked.set(slug, set)
          likes = prev + 1
          memoryCounts.set(keyCount, likes)
          liked = true
        }
      }
    } catch (e) {
      return res.status(500).json({ error: "failed to update likes" })
    }

    return res.status(200).json({ slug, likes, liked })
  }

  return res.status(405).json({ error: "Method Not Allowed" })
}
