import { idToUuid } from "notion-utils"
import { ExtendedRecordMap, ID } from "notion-types"

export default function getAllPageIds(
  response: ExtendedRecordMap,
  viewId?: string
) {
  const collectionQuery = response.collection_query
  const views = Object.values(collectionQuery)[0]

  let pageIds: ID[] = []
  if (viewId) {
    const vId = idToUuid(viewId)
    const view = views[vId]
    pageIds = view?.collection_group_results?.blockIds || view?.blockIds || []
  } else {
    const pageSet = new Set<ID>()
    // * type not exist
    Object.values(views).forEach((view: any) => {
      const blockIds = view?.collection_group_results?.blockIds || view?.blockIds || []
      blockIds.forEach((id: ID) => pageSet.add(id))
    })
    pageIds = [...pageSet]
  }
  return pageIds
}
