import { ExtendedRecordMap } from "notion-types"

const getBlockValue = (entry: unknown) =>
  (entry as any)?.value?.value || (entry as any)?.value

const sanitizeBlockEntry = (entry: unknown) => {
  const outer = entry as any
  const value = getBlockValue(entry)
  if (!value) return entry

  const sanitizedValue = { ...value }
  delete sanitizedValue.crdt_data
  delete sanitizedValue.crdt_format_version

  if (outer?.value?.value) {
    return {
      ...outer,
      value: {
        ...outer.value,
        value: sanitizedValue,
      },
    }
  }

  if (outer?.value) {
    return {
      ...outer,
      value: sanitizedValue,
    }
  }

  return {
    ...outer,
    value: sanitizedValue,
  }
}

const collectReachableBlockIds = (recordMap: ExtendedRecordMap, rootBlockId: string) => {
  const reachable = new Set<string>()
  const queue = [rootBlockId]

  while (queue.length > 0) {
    const id = queue.shift()
    if (!id || reachable.has(id)) continue

    const entry = recordMap.block?.[id]
    if (!entry) continue

    reachable.add(id)

    const value = getBlockValue(entry)
    for (const childId of value?.content || []) {
      queue.push(childId)
    }
  }

  return reachable
}

const hasReachableInlineCollection = (
  recordMap: ExtendedRecordMap,
  reachableBlockIds: Set<string>,
) =>
  Array.from(reachableBlockIds).some((id) => {
    const value = getBlockValue(recordMap.block?.[id])
    return value?.type === "collection_view" || value?.type === "collection_view_page"
  })

export const pruneRecordMap = (
  recordMap: ExtendedRecordMap,
  rootBlockId: string,
): ExtendedRecordMap => {
  const reachableBlockIds = collectReachableBlockIds(recordMap, rootBlockId)
  const block = Object.fromEntries(
    Array.from(reachableBlockIds).map((id) => [
      id,
      sanitizeBlockEntry(recordMap.block[id]),
    ]),
  )

  const pruned = { ...recordMap, block } as any

  if (!hasReachableInlineCollection(recordMap, reachableBlockIds)) {
    // react-notion-x still reads collection schema for page properties on
    // database-backed pages, but collection views and queries are not needed
    // unless the page itself contains an inline collection block.
    delete pruned.collection_view
    delete pruned.collection_query
  }

  return pruned as ExtendedRecordMap
}
