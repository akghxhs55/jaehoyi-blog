import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"
import { kvGet, kvSet } from "src/libs/cache/kv"

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */

// Simple in-memory cache to avoid hitting Notion on every request (per instance)
let POSTS_CACHE: { data: TPosts; ts: number } | null = null

// TODO: react query를 사용해서 처음 불러온 뒤로는 해당데이터만 사용하도록 수정
export const getPosts = async () => {
  const ttlSec = Math.max(60, Number(CONFIG.revalidateTime || 0)) // seconds
  const ttlMs = ttlSec * 1000
  const now = Date.now()

  // 1) Try global KV cache first (works across instances and restarts)
  const kvKey = "notion:posts"
  const kvCached = await kvGet<TPosts>(kvKey)
  if (kvCached && Array.isArray(kvCached)) {
    // Update per-instance memory cache for faster subsequent hits
    POSTS_CACHE = { data: kvCached, ts: now }
    return kvCached
  }

  // 2) Fallback to per-instance memory cache
  if (POSTS_CACHE && now - POSTS_CACHE.ts < ttlMs) {
    return POSTS_CACHE.data
  }

  let id = CONFIG.notionConfig.pageId as string
  const api = new NotionAPI()

  const response = await api.getPage(id)
  id = idToUuid(id)
  const collection = Object.values(response.collection)[0]?.value
  const block = response.block
  const schema = collection?.schema

  const rawMetadata = block[id].value

  // Check Type
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    POSTS_CACHE = { data: [], ts: now }
    // Populate empty list to KV to avoid repeated Notion hits if misconfigured
    await kvSet<TPosts>(kvKey, [], ttlSec)
    return []
  } else {
    // Construct Data
    const pageIds = getAllPageIds(response)
    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const id = pageIds[i]
      const properties = (await getPageProperties(id, block, schema)) || null
      // Add fullwidth, createdtime to properties
      properties.createdTime = new Date(
        block[id].value?.created_time
      ).toString()
      properties.fullWidth =
        (block[id].value?.format as any)?.page_full_width ?? false

      data.push(properties)
    }

    // Sort by date
    data.sort((a: any, b: any) => {
      const dateA: any = new Date(a?.date?.start_date || a.createdTime)
      const dateB: any = new Date(b?.date?.start_date || b.createdTime)
      return dateB - dateA
    })

    const posts = data as TPosts
    POSTS_CACHE = { data: posts, ts: now }
    // Write-through to KV for cross-instance caching
    await kvSet<TPosts>(kvKey, posts, ttlSec)
    return posts
  }
}
