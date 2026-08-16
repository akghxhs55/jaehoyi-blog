import assert from "node:assert/strict"
import test from "node:test"

import {
  createNotionImageResolver,
  fetchNotionImageBody,
  getNotionImageCacheControl,
  isAllowedNotionImageUrl,
  isValidNotionAttachmentSource,
  notionImageUrlExpiresSoon,
} from "../pages/api/notion-image"

test("accepts only known Notion image hosts", () => {
  assert.equal(
    isAllowedNotionImageUrl("https://file.notion.so/f/image.png"),
    true
  )
  assert.equal(
    isAllowedNotionImageUrl("https://file.notion.com/f/image.png"),
    true
  )
  assert.equal(
    isAllowedNotionImageUrl("https://img.notionusercontent.com/image.png"),
    true
  )
  assert.equal(
    isAllowedNotionImageUrl("https://file.notion.com.example.com/image.png"),
    false
  )
  assert.equal(isAllowedNotionImageUrl("https://example.com/image.png"), false)
})

test("accepts only Notion attachment sources", () => {
  assert.equal(
    isValidNotionAttachmentSource(
      "attachment:87a5843b-d464-44ab-aa1f-0d8e2453338e:image.png"
    ),
    true
  )
  assert.equal(
    isValidNotionAttachmentSource("https://example.com/a.png"),
    false
  )
})

test("loads an image body for the Next.js image optimizer", async () => {
  const body = new Uint8Array([137, 80, 78, 71])
  const image = await fetchNotionImageBody(
    "https://file.notion.com/f/image.png",
    async () =>
      new Response(body, {
        headers: { "Content-Type": "image/png; charset=binary" },
      })
  )

  assert.equal(image?.contentType, "image/png")
  assert.deepEqual(new Uint8Array(image?.body || []), body)
})

test("rejects a non-image response for the image optimizer", async () => {
  const image = await fetchNotionImageBody(
    "https://file.notion.com/f/image.png",
    async () =>
      new Response("not an image", {
        headers: { "Content-Type": "text/html" },
      })
  )

  assert.equal(image, undefined)
})

test("refreshes signed URLs shortly before they expire", () => {
  const now = Date.UTC(2026, 7, 16, 12)
  const expiresSoon = `${now + 4 * 60 * 1000}`
  const expiresLater = `${now + 10 * 60 * 1000}`

  assert.equal(
    notionImageUrlExpiresSoon(
      `https://file.notion.so/image.png?expirationTimestamp=${expiresSoon}`,
      now
    ),
    true
  )
  assert.equal(
    notionImageUrlExpiresSoon(
      `https://file.notion.so/image.png?expirationTimestamp=${expiresLater}`,
      now
    ),
    false
  )
})

test("bounds CDN caching by the signed URL expiration", () => {
  const now = Date.UTC(2026, 7, 16, 12)
  const expiresInTenMinutes = now + 10 * 60 * 1000

  assert.equal(
    getNotionImageCacheControl(
      `https://file.notion.so/image.png?expirationTimestamp=${expiresInTenMinutes}`,
      now
    ),
    "public, max-age=60, s-maxage=300, stale-while-revalidate=300"
  )

  const expiresInOneDay = now + 24 * 60 * 60 * 1000
  assert.match(
    getNotionImageCacheControl(
      `https://file.notion.so/image.png?expirationTimestamp=${expiresInOneDay}`,
      now
    ),
    /s-maxage=21600/
  )
})

test("coalesces concurrent image lookups for the same page", async () => {
  const pageId = "3bd9567b-c6b8-808f-875e-e9d25d44b4b6"
  const now = Date.UTC(2026, 7, 16, 12)
  const expiresAt = now + 60 * 60 * 1000
  let loadCount = 0
  const signedUrls = {
    first: `https://file.notion.so/first.png?expirationTimestamp=${expiresAt}`,
    second: `https://file.notion.so/second.png?expirationTimestamp=${expiresAt}`,
    third: `https://file.notion.so/third.png?expirationTimestamp=${expiresAt}`,
  }
  const resolveImage = createNotionImageResolver({
    clearRecordMap: async () => undefined,
    loadRecordMap: async () => {
      loadCount += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      return { signed_urls: signedUrls }
    },
    now: () => now,
  })

  const results = await Promise.all([
    resolveImage(pageId, "first"),
    resolveImage(pageId, "second"),
    resolveImage(pageId, "third"),
  ])

  assert.deepEqual(results, [
    signedUrls.first,
    signedUrls.second,
    signedUrls.third,
  ])
  assert.equal(loadCount, 1)

  await resolveImage(pageId, "first")
  assert.equal(loadCount, 1)
})

test("coalesces a concurrent refresh for expiring URLs", async () => {
  const pageId = "3bd9567b-c6b8-808f-875e-e9d25d44b4b6"
  const now = Date.UTC(2026, 7, 16, 12)
  const expiringUrl = `https://file.notion.so/old.png?expirationTimestamp=${now + 60_000}`
  const freshUrl = `https://file.notion.so/new.png?expirationTimestamp=${now + 60 * 60 * 1000}`
  let clearCount = 0
  let loadCount = 0
  const resolveImage = createNotionImageResolver({
    clearRecordMap: async () => {
      clearCount += 1
    },
    loadRecordMap: async () => {
      loadCount += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      return {
        signed_urls: { image: loadCount === 1 ? expiringUrl : freshUrl },
      }
    },
    now: () => now,
  })

  const results = await Promise.all([
    resolveImage(pageId, "image"),
    resolveImage(pageId, "image"),
    resolveImage(pageId, "image"),
  ])

  assert.deepEqual(results, [freshUrl, freshUrl, freshUrl])
  assert.equal(loadCount, 2)
  assert.equal(clearCount, 1)
})

test("uses a provided signed URL without loading the record map", async () => {
  const pageId = "3bd9567b-c6b8-808f-875e-e9d25d44b4b6"
  const now = Date.UTC(2026, 7, 16, 12)
  const signedUrl = `https://file.notion.so/image.png?expirationTimestamp=${now + 60 * 60 * 1000}`
  let loadCount = 0
  const resolveImage = createNotionImageResolver({
    clearRecordMap: async () => undefined,
    loadRecordMap: async () => {
      loadCount += 1
      return { signed_urls: {} }
    },
    now: () => now,
  })

  assert.equal(await resolveImage(pageId, pageId, { signedUrl }), signedUrl)
  assert.equal(loadCount, 0)
})

test("signs an attachment source without loading the record map", async () => {
  const pageId = "3bd9567b-c6b8-808f-875e-e9d25d44b4b6"
  const now = Date.UTC(2026, 7, 16, 12)
  const source = "attachment:87a5843b-d464-44ab-aa1f-0d8e2453338e:image.png"
  const signedUrl = `https://img.notionusercontent.com/image.png?exp=${Math.floor(now / 1000) + 3600}`
  let loadCount = 0
  let signCount = 0
  const resolveImage = createNotionImageResolver({
    clearRecordMap: async () => undefined,
    loadRecordMap: async () => {
      loadCount += 1
      return { signed_urls: {} }
    },
    signFileUrl: async (blockId, receivedSource) => {
      signCount += 1
      assert.equal(blockId, pageId)
      assert.equal(receivedSource, source)
      return signedUrl
    },
    now: () => now,
  })

  assert.equal(await resolveImage(pageId, pageId, { source }), signedUrl)
  assert.equal(signCount, 1)
  assert.equal(loadCount, 0)
})

test("falls back to the Notion image redirect when signing fails", async () => {
  const pageId = "3bd9567b-c6b8-808f-875e-e9d25d44b4b6"
  const source = "attachment:87a5843b-d464-44ab-aa1f-0d8e2453338e:image.png"
  const redirectedUrl =
    "https://img.notionusercontent.com/image.png?exp=9999999999"
  let loadCount = 0
  const resolveImage = createNotionImageResolver({
    clearRecordMap: async () => undefined,
    loadRecordMap: async () => {
      loadCount += 1
      return { signed_urls: {} }
    },
    resolveAttachment: async () => redirectedUrl,
    signFileUrl: async () => {
      throw new Error("signing unavailable")
    },
  })

  assert.equal(await resolveImage(pageId, pageId, { source }), redirectedUrl)
  assert.equal(loadCount, 0)
})
