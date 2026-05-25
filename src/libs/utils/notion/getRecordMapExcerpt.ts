import { ExtendedRecordMap } from "notion-types"

type ExcerptOptions = {
  maxLength?: number
}

const DEFAULT_MAX_LENGTH = 155

const getBlockValue = (entry: unknown) =>
  (entry as any)?.value?.value || (entry as any)?.value

const getRichTextPlainText = (richText: unknown) => {
  if (!Array.isArray(richText)) return ""

  return richText
    .map((part) => (Array.isArray(part) ? part[0] : ""))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
}

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text

  const sliced = text.slice(0, maxLength + 1)
  const lastSpace = sliced.lastIndexOf(" ")
  const end = lastSpace > Math.floor(maxLength * 0.6) ? lastSpace : maxLength

  return `${sliced.slice(0, end).trim()}...`
}

export const getRecordMapExcerpt = (
  recordMap: ExtendedRecordMap,
  rootBlockId: string,
  options: ExcerptOptions = {},
) => {
  const maxLength = options.maxLength || DEFAULT_MAX_LENGTH
  const root = getBlockValue(recordMap.block?.[rootBlockId])
  const queue = [...(root?.content || [])]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const id = queue.shift()
    if (!id || visited.has(id)) continue
    visited.add(id)

    const block = getBlockValue(recordMap.block?.[id])
    if (!block) continue

    const text = getRichTextPlainText(block.properties?.title)
    if (text) return truncate(text, maxLength)

    for (const childId of block.content || []) {
      queue.push(childId)
    }
  }

  return ""
}
