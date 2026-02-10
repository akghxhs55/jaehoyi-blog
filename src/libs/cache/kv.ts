// Lightweight wrapper around @upstash/redis that fails gracefully when Redis is not configured
// Avoids import errors in local/dev environments without Redis

import { Redis } from "@upstash/redis"

export type KvLike = {
  get<T = unknown>(key: string): Promise<T | null>
  set<T = unknown>(key: string, value: T, opts?: { ex?: number }): Promise<unknown>
}

let cachedClient: KvLike | null | undefined

async function getClient(): Promise<KvLike | null> {
  if (cachedClient !== undefined) return cachedClient
  try {
    // Basic env presence check — if missing, treat as unavailable
    const hasEnv = !!(
      process.env.KV_URL ||
      process.env.KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN
    )

    if (!hasEnv) {
      cachedClient = null
      return null
    }

    // Initialize Upstash Redis client
    const client = new Redis({
      url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
    })

    cachedClient = client
  } catch {
    cachedClient = null
  }
  return cachedClient
}

export async function kvGet<T = unknown>(key: string): Promise<T | null> {
  const client = await getClient()
  if (!client) return null
  try {
    return (await client.get<T>(key)) as T | null
  } catch {
    return null
  }
}

export async function kvSet<T = unknown>(
  key: string,
  value: T,
  ex?: number
): Promise<boolean> {
  const client = await getClient()
  if (!client) return false
  try {
    await client.set(key, value as unknown as any, ex ? { ex } : undefined)
    return true
  } catch {
    return false
  }
}
