import { GetStaticPaths, GetStaticProps, NextPage } from "next"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import Feed from "src/routes/Feed"
import Pagination from "src/components/Pagination"
import { TPost } from "src/types"
import MetaConfig from "src/components/MetaConfig"

function getTopCategories(posts: TPost[], limit = 50): string[] {
  const map: Record<string, number> = {}
  for (const p of posts) {
    if (!p?.status?.includes("Public")) continue
    const c = Array.isArray(p.category) ? p.category[0] : p.category
    if (c) map[c] = (map[c] || 0) + 1
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([c]) => c)
}

type Props = {
  posts: TPost[]
  currentPage: number
  totalPages: number
  allTags: string[]
  category: string
}

const CategoryPage: NextPage<Props> = ({ posts, currentPage, totalPages, allTags, category }) => {
  const meta = {
    title: `${CONFIG.blog.title}`,
    description: CONFIG.blog.description,
    type: "Website",
    url: `${CONFIG.link}/category/${encodeURIComponent(category)}`,
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
  const cats = getTopCategories(posts, 50)
  return {
    paths: cats.map((c) => ({ params: { category: c } })),
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const revalidate = Math.max(60, Number(CONFIG.revalidateTime || 0))
  const raw = context.params?.category
  const category = String(Array.isArray(raw) ? raw[0] : raw)

  const posts = await getPosts()
  const visible = posts.filter((p) => p.status?.includes("Public"))
  const byCategory = visible.filter((p) => (p.category || "") === category)

  if (byCategory.length === 0) {
    return { notFound: true, revalidate }
  }

  const postsPerPage = CONFIG.postsPerPage
  const totalPages = Math.max(1, Math.ceil(byCategory.length / postsPerPage))
  const pagePosts = byCategory.slice(0, postsPerPage)

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags || [])))

  return {
    props: {
      posts: pagePosts,
      currentPage: 1,
      totalPages,
      allTags,
      category,
    },
    revalidate,
  }
}

export default CategoryPage
