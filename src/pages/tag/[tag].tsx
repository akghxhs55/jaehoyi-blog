import { GetStaticPaths, GetStaticProps, NextPage } from "next"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import Feed from "src/routes/Feed"
import Pagination from "src/components/Pagination"
import { TPost } from "src/types"
import MetaConfig from "src/components/MetaConfig"

function getTopTags(posts: TPost[], limit = 50): string[] {
  const map: Record<string, number> = {}
  for (const p of posts) {
    if (!p?.status?.includes("Public")) continue
    for (const t of p.tags || []) {
      map[t] = (map[t] || 0) + 1
    }
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t)
}

type Props = {
  posts: TPost[]
  currentPage: number
  totalPages: number
  allTags: string[]
  tag: string
}

const TagPage: NextPage<Props> = ({ posts, currentPage, totalPages, allTags, tag }) => {
  const meta = {
    title: `${CONFIG.blog.title}`,
    description: CONFIG.blog.description,
    type: "Website",
    url: `${CONFIG.link}/tag/${encodeURIComponent(tag)}`,
  }
  return (
    <>
      <MetaConfig {...meta} />
      <Feed posts={posts} allTags={allTags} />
      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPosts()
  const tags = getTopTags(posts, 50)
  return {
    paths: tags.map((t) => ({ params: { tag: t } })),
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const revalidate = Math.max(60, Number(CONFIG.revalidateTime || 0))
  const raw = context.params?.tag
  const tag = String(Array.isArray(raw) ? raw[0] : raw)

  const posts = await getPosts()
  const visible = posts.filter((p) => p.status?.includes("Public"))
  const byTag = visible.filter((p) => (p.tags || []).includes(tag))

  if (byTag.length === 0) {
    return { notFound: true, revalidate }
  }

  const postsPerPage = CONFIG.postsPerPage
  const totalPages = Math.max(1, Math.ceil(byTag.length / postsPerPage))
  const pagePosts = byTag.slice(0, postsPerPage)

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags || [])))

  return {
    props: {
      posts: pagePosts,
      currentPage: 1,
      totalPages,
      allTags,
      tag,
    },
    revalidate,
  }
}

export default TagPage
