import { getPosts } from "../apis"
import { CONFIG } from "site.config"
import type { GetServerSideProps } from "next"

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { res } = ctx

  const swr = Math.max(60, Number((CONFIG as any).revalidateTime || 0))
  try {
    const posts = (await getPosts()) || []

    // Include only visible/public posts with valid slug
    const visible = (Array.isArray(posts) ? posts : []).filter(
      (p: any) => p?.slug && p?.status?.includes?.("Public")
    )

    const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = []

    // Root entry
    const latest =
      visible?.[0]?.date?.start_date || visible?.[0]?.createdTime || Date.now()
    urls.push({
      loc: CONFIG.link,
      lastmod: new Date(latest).toISOString(),
      changefreq: "daily",
      priority: "1.0",
    })

    // Pagination pages: /page/1..N (cap at 5 to keep sitemap small)
    const postsPerPage = (CONFIG as any).postsPerPage || 10
    const totalPages = Math.max(1, Math.ceil(visible.length / postsPerPage))
    const pageCap = Math.min(5, totalPages)
    for (let p = 1; p <= pageCap; p++) {
      urls.push({
        loc: `${CONFIG.link}/page/${p}`,
        lastmod: new Date(latest).toISOString(),
        changefreq: "daily",
        priority: "0.6",
      })
    }

    // Top tags and categories list pages (page 1)
    const tagCount: Record<string, number> = {}
    const catCount: Record<string, number> = {}
    for (const post of visible) {
      for (const t of post.tags || []) tagCount[t] = (tagCount[t] || 0) + 1
      const c = Array.isArray(post.category) ? post.category[0] : post.category
      if (c) catCount[c] = (catCount[c] || 0) + 1
    }
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([t]) => t)
    const topCats = Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([c]) => c)

    for (const t of topTags) {
      urls.push({
        loc: `${CONFIG.link}/tag/${encodeURIComponent(t)}`,
        lastmod: new Date(latest).toISOString(),
        changefreq: "daily",
        priority: "0.5",
      })
    }
    for (const c of topCats) {
      urls.push({
        loc: `${CONFIG.link}/category/${encodeURIComponent(c)}`,
        lastmod: new Date(latest).toISOString(),
        changefreq: "daily",
        priority: "0.5",
      })
    }

    // Individual post URLs
    for (const post of visible) {
      const dateStr = post?.date?.start_date || post?.createdTime || Date.now()
      const loc = `${CONFIG.link}/${post.slug}`
      urls.push({
        loc: encodeURI(loc),
        lastmod: new Date(dateStr).toISOString(),
        changefreq: "daily",
        priority: "0.7",
      })
    }

    const body =
      `<?xml version=\"1.0\" encoding=\"UTF-8\"?>` +
      `\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">` +
      urls
        .map(
          (u) =>
            `\n  <url>` +
            `\n    <loc>${escapeXml(u.loc)}</loc>` +
            `\n    <lastmod>${escapeXml(u.lastmod)}</lastmod>` +
            `\n    <changefreq>${u.changefreq}</changefreq>` +
            `\n    <priority>${u.priority}</priority>` +
            `\n  </url>`
        )
        .join("") +
      `\n</urlset>`

    res.setHeader("Content-Type", "application/xml; charset=utf-8")
    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${swr}, stale-while-revalidate=${Math.max(60, Math.floor(swr / 2))}`
    )
    res.write(body)
    res.end()
  } catch (e) {
    const fallback =
      `<?xml version=\"1.0\" encoding=\"UTF-8\"?>` +
      `\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">` +
      `\n  <url>` +
      `\n    <loc>${escapeXml(CONFIG.link)}</loc>` +
      `\n    <lastmod>${new Date().toISOString()}</lastmod>` +
      `\n    <changefreq>daily</changefreq>` +
      `\n    <priority>1.0</priority>` +
      `\n  </url>` +
      `\n</urlset>`

    try {
      res.setHeader("Content-Type", "application/xml; charset=utf-8")
      res.setHeader(
        "Cache-Control",
        `public, s-maxage=${swr}, stale-while-revalidate=${Math.max(60, Math.floor(swr / 2))}`
      )
    } catch {}

    res.write(fallback)
    res.end()
  }

  // Important: Always return a plain object to satisfy Next.js
  return { props: {} }
}

// Default export to prevent next.js errors and satisfy Pages Router
export default function Sitemap() { return null }
