import fs from "node:fs/promises"
import path from "node:path"

const cacheDir = path.join(process.cwd(), ".next", "cache", "notion")

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const isVercelRuntime = Boolean(process.env.VERCEL)
const isProductionBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build"
const notionRequestTimeoutMs = Number(
  process.env.NOTION_REQUEST_TIMEOUT_MS ||
    (isVercelRuntime && !isProductionBuild ? 7000 : 30000)
)

async function readCacheFile<T>(filePath: string, ttlMs: number) {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    const parsed = JSON.parse(raw) as { ts: number; data: T }
    if (Date.now() - parsed.ts < ttlMs) return parsed.data
  } catch {
    return null
  }
  return null
}

async function writeCacheFile<T>(filePath: string, data: T) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(
      filePath,
      JSON.stringify({ ts: Date.now(), data }),
      "utf8"
    )
  } catch {
    // File-system cache is a build optimization only. Ignore read-only runtimes.
  }
}

async function acquireLock(
  lockPath: string,
  options: { timeoutMs?: number; staleMs?: number } = {}
) {
  const timeoutMs = options.timeoutMs ?? 1500
  const staleMs = options.staleMs ?? 30_000
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await fs.mkdir(path.dirname(lockPath), { recursive: true })
      const handle = await fs.open(lockPath, "wx")
      return async () => {
        await handle.close().catch(() => undefined)
        await fs.unlink(lockPath).catch(() => undefined)
      }
    } catch {
      try {
        const stat = await fs.stat(lockPath)
        if (Date.now() - stat.mtimeMs > staleMs) {
          await fs.unlink(lockPath).catch(() => undefined)
        }
      } catch {
        // Another worker may have released the lock between checks.
      }
      await sleep(250)
    }
  }

  return null
}

async function runWithBuildRequestLock<T>(operation: () => Promise<T>) {
  if (!isProductionBuild) return operation()

  const release = await acquireLock(path.join(cacheDir, "request.lock"), {
    timeoutMs: 600_000,
    staleMs: 120_000,
  })

  if (!release) return operation()

  try {
    return await operation()
  } finally {
    await sleep(1500)
    await release()
  }
}

export async function withNotionFileCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
) {
  const safeKey = key.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filePath = path.join(cacheDir, `${safeKey}.json`)
  const lockPath = path.join(cacheDir, `${safeKey}.lock`)

  const cached = await readCacheFile<T>(filePath, ttlMs)
  if (cached) return cached

  const release = await acquireLock(lockPath)
  if (!release) return fetcher()

  try {
    const cacheAfterLock = await readCacheFile<T>(filePath, ttlMs)
    if (cacheAfterLock) return cacheAfterLock

    const data = await fetcher()
    await writeCacheFile(filePath, data)
    return data
  } finally {
    await release()
  }
}

export async function clearNotionFileCache(key: string) {
  const safeKey = key.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filePath = path.join(cacheDir, `${safeKey}.json`)
  const lockPath = path.join(cacheDir, `${safeKey}.lock`)

  await Promise.all([
    fs.unlink(filePath).catch(() => undefined),
    fs.unlink(lockPath).catch(() => undefined),
  ])
}

function isRetryableNotionError(error: unknown) {
  const status =
    (error as any)?.status ||
    (error as any)?.statusCode ||
    (error as any)?.response?.status
  const message = error instanceof Error ? error.message : String(error)

  return (
    status === 429 ||
    (typeof status === "number" && status >= 500) ||
    message.includes("429") ||
    message.includes("loadPageChunk")
  )
}

export async function withNotionRetry<T>(operation: () => Promise<T>) {
  const maxAttempts = isProductionBuild ? 6 : isVercelRuntime ? 1 : 3

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await runWithBuildRequestLock(operation)
    } catch (error) {
      if (attempt === maxAttempts || !isRetryableNotionError(error)) {
        throw error
      }

      const backoffMs = isProductionBuild
        ? Math.min(15000, 2000 * 2 ** (attempt - 1))
        : Math.min(2000, 300 * 2 ** (attempt - 1))
      await sleep(backoffMs)
    }
  }

  return runWithBuildRequestLock(operation)
}

export const getNotionFetchOptions = () => ({
  timeout: notionRequestTimeoutMs,
})
