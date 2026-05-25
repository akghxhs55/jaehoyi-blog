import { NextApiRequest, NextApiResponse } from "next"
import { clearPostsCache, clearRecordMapCache, getPosts } from "../../apis"
import { filterPosts } from "src/libs/utils/notion"
import { CONFIG } from "site.config"

// for all path revalidate, https://<your-site.com>/api/revalidate?secret=<token>
// for specific path revalidate, https://<your-site.com>/api/revalidate?secret=<token>&path=<path>
// example, https://<your-site.com>/api/revalidate?secret=이것은_키&path=feed
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { secret, path } = req.query
  if (secret !== process.env.TOKEN_FOR_REVALIDATE) {
    return res.status(401).json({ message: "Invalid token" })
  }

  try {
    await clearPostsCache()
    const posts = await getPosts()
    const visiblePosts = filterPosts(posts)

    if (path && typeof path === "string") {
      const targetPath = path.startsWith("/") ? path : `/${path}`
      const targetSlug = targetPath.replace(/^\/+/, "").split("?")[0]
      const targetPost = visiblePosts.find((row) => row.slug === targetSlug)
      if (targetPost) await clearRecordMapCache(targetPost.id)

      await res.revalidate(targetPath)
    } else {
      const paths = new Set<string>(["/", "/sitemap.xml"])
      const postsPerPage = Math.max(1, Number(CONFIG.postsPerPage || 10))
      const totalPages = Math.max(1, Math.ceil(visiblePosts.length / postsPerPage))
      const tagCounts = new Map<string, number>()
      const categoryCounts = new Map<string, number>()

      for (let page = 1; page <= totalPages; page++) {
        paths.add(`/page/${page}`)
      }

      for (const row of visiblePosts) {
        paths.add(`/${row.slug}`)
        await clearRecordMapCache(row.id)

        for (const tag of row.tags || []) {
          paths.add(`/tag/${encodeURIComponent(tag)}`)
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        }

        for (const category of row.category || []) {
          paths.add(`/category/${encodeURIComponent(category)}`)
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
        }
      }

      for (const [tag, count] of tagCounts) {
        const tagPages = Math.ceil(count / postsPerPage)
        for (let page = 1; page <= tagPages; page++) {
          paths.add(`/tag/${encodeURIComponent(tag)}/page/${page}`)
        }
      }

      for (const [category, count] of categoryCounts) {
        const categoryPages = Math.ceil(count / postsPerPage)
        for (let page = 1; page <= categoryPages; page++) {
          paths.add(`/category/${encodeURIComponent(category)}/page/${page}`)
        }
      }

      const revalidateRequests = Array.from(paths).map((targetPath) =>
        res.revalidate(targetPath)
      )
      await Promise.all(revalidateRequests)
    }

    res.json({ revalidated: true })
  } catch (err) {
    return res.status(500).send("Error revalidating")
  }
}
