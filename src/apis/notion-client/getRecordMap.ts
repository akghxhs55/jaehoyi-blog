import { NotionAPI } from "notion-client"
import { clearNotionFileCache, withNotionFileCache, withNotionRetry } from "./notionCache"
import { CONFIG } from "site.config"

export const getRecordMap = async (pageId: string) => {
  const ttlSec = Math.max(60, Number(CONFIG.revalidateTime || 0))
  const api = new NotionAPI()

  return withNotionFileCache(`record-map:${pageId}`, ttlSec * 1000, () =>
    withNotionRetry(() => api.getPage(pageId))
  )
}

export const clearRecordMapCache = (pageId: string) =>
  clearNotionFileCache(`record-map:${pageId}`)
