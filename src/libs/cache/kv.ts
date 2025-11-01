// Lightweight wrapper around @vercel/kv that fails gracefully when KV is not configured
// Avoids import errors in local/dev environments without KV

export type KvLike = {
  get<T = unknown>(key: string): Promise<T | null>
  set<T = unknown>(key: string, value: T, opts?: { ex?: number }): Promise<unknown>
}

let cachedClient: KvLike | null | undefined

async function getClient(): Promise<KvLike | null> {
  if (cachedClient !== undefined) return cachedClient
  try {
    // Dynamic import to prevent static resolution when not installed/configured
    const mod = await import("@vercel/kv")
    const client: KvLike | null = (mod as any)?.kv ?? null
    // Basic env presence check — if missing, treat as unavailable
    const hasEnv = !!(
      process.env.KV_URL ||
      process.env.KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN
    )
    cachedClient = hasEnv ? client : null
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
