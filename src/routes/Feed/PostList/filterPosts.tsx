import { DEFAULT_CATEGORY } from "src/constants"
import { TPost } from "src/types"

interface FilterPostsParams {
  posts: TPost[]
  q: string
  tag?: string | string[]
  category?: string
  order?: string
  tagMode?: "and" | "or"
}

export function filterPosts({
  posts,
  q,
  tag = undefined,
  category = DEFAULT_CATEGORY,
  order = "desc",
  tagMode = "and",
}: FilterPostsParams): TPost[] {
  const selectedTags: string[] = Array.isArray(tag)
    ? tag
    : typeof tag === "string" && tag.length > 0
    ? tag.split(",")
    : []

  return posts
    .filter((post) => {
      const tagContent = post.tags ? post.tags.join(" ") : ""
      const searchContent = post.title + post.summary + tagContent

      const matchesQuery = searchContent
        .toLowerCase()
        .includes(q.toLowerCase())

      const matchesTags = (() => {
        if (selectedTags.length === 0) return true
        if (!post.tags || post.tags.length === 0) return false

        if (tagMode === "or") {
          // OR: at least one of selectedTags exists in post.tags
          return selectedTags.some((t) => post.tags!.includes(t))
        }

        // AND: all selectedTags must exist in post.tags
        return selectedTags.every((t) => post.tags!.includes(t))
      })()

      const matchesCategory =
        category === DEFAULT_CATEGORY ||
        (post.category && post.category.includes(category))

      return matchesQuery && matchesTags && matchesCategory
    })
    .sort((a, b) => {
      const dateA = new Date(a?.date?.start_date || a.createdTime).getTime()
      const dateB = new Date(b?.date?.start_date || b.createdTime).getTime()
      return order === "desc" ? dateB - dateA : dateA - dateB
    })
}
