import { NotionAPI } from "notion-client"

export const getRecordMap = async (pageId: string) => {
  const api = new NotionAPI({
    apiBaseUrl: "https://klimmek55.notion.site/api/v3"
  })
  const recordMap = await api.getPage(pageId)
  return recordMap
}
