import type { NextApiRequest, NextApiResponse } from "next"

import {
  clearRecordMapCache,
  getRecordMap,
} from "src/apis/notion-client/getRecordMap"

const notionIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const refreshBufferMs = 5 * 60 * 1000
const fallbackCacheTtlMs = 5 * 60 * 1000
const memoryCacheTtlMs = 30 * 60 * 1000
const maxCdnCacheTtlSec = 6 * 60 * 60
const maxMemoryCacheEntries = 50

type SignedUrls = Record<string, string>
type RecordMapWithSignedUrls = { signed_urls?: SignedUrls }

export const isAllowedNotionImageUrl = (url: string) => {
  try {
    const { hostname, protocol } = new URL(url)
    return (
      protocol === "https:" &&
      (hostname === "file.notion.so" ||
        hostname === "img.notionusercontent.com" ||
        hostname.endsWith(".amazonaws.com"))
    )
  } catch {
    return false
  }
}

export const notionImageUrlExpiresAt = (url: string) => {
  try {
    const parsed = new URL(url)
    const expirationTimestamp = parsed.searchParams.get("expirationTimestamp")
    const expirationSeconds = parsed.searchParams.get("exp")
    const expiresAt = expirationTimestamp
      ? Number(expirationTimestamp)
      : expirationSeconds
        ? Number(expirationSeconds) * 1000
        : null

    return expiresAt !== null && Number.isFinite(expiresAt) ? expiresAt : null
  } catch {
    return null
  }
}

export const notionImageUrlExpiresSoon = (url: string, now = Date.now()) => {
  const expiresAt = notionImageUrlExpiresAt(url)
  return expiresAt !== null && expiresAt <= now + refreshBufferMs
}

export const getNotionImageCacheControl = (url: string, now = Date.now()) => {
  const expiresAt = notionImageUrlExpiresAt(url)
  const safeTtlSec = expiresAt
    ? Math.floor((expiresAt - now - refreshBufferMs) / 1000)
    : fallbackCacheTtlMs / 1000
  const sharedMaxAge = Math.max(60, Math.min(maxCdnCacheTtlSec, safeTtlSec))
  const staleWhileRevalidate = Math.min(300, sharedMaxAge)

  return `public, max-age=60, s-maxage=${sharedMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
}

type NotionImageResolverOptions = {
  clearRecordMap: (pageId: string) => Promise<unknown>
  loadRecordMap: (pageId: string) => Promise<RecordMapWithSignedUrls>
  now?: () => number
}

export const createNotionImageResolver = ({
  clearRecordMap,
  loadRecordMap,
  now = Date.now,
}: NotionImageResolverOptions) => {
  const pageCache = new Map<
    string,
    { expiresAt: number; signedUrls: SignedUrls }
  >()
  const pageLoads = new Map<string, Promise<SignedUrls>>()

  const cacheSignedUrls = (pageId: string, signedUrls: SignedUrls) => {
    const currentTime = now()
    const signedUrlExpirations = Object.values(signedUrls)
      .map(notionImageUrlExpiresAt)
      .filter((expiresAt): expiresAt is number => expiresAt !== null)
    const earliestSafeExpiration = signedUrlExpirations.length
      ? Math.min(...signedUrlExpirations) - refreshBufferMs
      : currentTime + fallbackCacheTtlMs

    if (!pageCache.has(pageId) && pageCache.size >= maxMemoryCacheEntries) {
      const oldestPageId = pageCache.keys().next().value
      if (oldestPageId) pageCache.delete(oldestPageId)
    }

    pageCache.set(pageId, {
      expiresAt: Math.min(
        currentTime + memoryCacheTtlMs,
        earliestSafeExpiration
      ),
      signedUrls,
    })
  }

  const loadSignedUrls = async (pageId: string, refresh = false) => {
    const cached = pageCache.get(pageId)
    if (!refresh && cached && cached.expiresAt > now()) {
      return cached.signedUrls
    }

    const pendingLoad = pageLoads.get(pageId)
    if (pendingLoad) return pendingLoad

    const load = (async () => {
      if (refresh) await clearRecordMap(pageId)
      const recordMap = await loadRecordMap(pageId)
      const signedUrls = recordMap.signed_urls || {}
      cacheSignedUrls(pageId, signedUrls)
      return signedUrls
    })()

    pageLoads.set(pageId, load)
    try {
      return await load
    } finally {
      if (pageLoads.get(pageId) === load) pageLoads.delete(pageId)
    }
  }

  return async (pageId: string, blockId: string) => {
    let signedUrls = await loadSignedUrls(pageId)
    let signedUrl = signedUrls[blockId]

    if (!signedUrl || notionImageUrlExpiresSoon(signedUrl, now())) {
      signedUrls = await loadSignedUrls(pageId, true)
      signedUrl = signedUrls[blockId]
    }

    return signedUrl
  }
}

const getSignedImageUrl = createNotionImageResolver({
  clearRecordMap: clearRecordMapCache,
  loadRecordMap: getRecordMap,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    return res.status(405).json({ error: "Method not allowed" })
  }

  const pageId = Array.isArray(req.query.pageId)
    ? req.query.pageId[0]
    : req.query.pageId
  const blockId = Array.isArray(req.query.blockId)
    ? req.query.blockId[0]
    : req.query.blockId

  if (
    !pageId ||
    !blockId ||
    !notionIdPattern.test(pageId) ||
    !notionIdPattern.test(blockId)
  ) {
    return res.status(400).json({ error: "Invalid Notion image identifiers" })
  }

  try {
    const signedUrl = await getSignedImageUrl(pageId, blockId)

    if (!signedUrl || !isAllowedNotionImageUrl(signedUrl)) {
      return res.status(404).json({ error: "Notion image not found" })
    }

    res.setHeader("Cache-Control", getNotionImageCacheControl(signedUrl))
    return res.redirect(307, signedUrl)
  } catch {
    return res.status(502).json({ error: "Unable to load Notion image" })
  }
}
