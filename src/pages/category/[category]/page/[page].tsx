import { GetStaticPaths, GetStaticProps, NextPage } from "next"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import Feed from "src/routes/Feed"
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
  allTags: string[]
  category: string
}

const CategoryPagedPage: NextPage<Props> = ({ posts, currentPage, allTags, category }) => {
  const meta = {
    title: `${CONFIG.blog.title}`,
    description: CONFIG.blog.description,
    type: "Website",
    url: `${CONFIG.link}/category/${encodeURIComponent(category)}/page/${currentPage}`,
  }
  return (
    <>
      <MetaConfig {...meta} />
      <Feed posts={posts} allTags={allTags} />
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPosts()
  const cats = getTopCategories(posts, 50)
  const paths = cats.map((c) => ({ params: { category: c, page: '1' } }))
  return {
    paths,
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const revalidate = Math.max(60, Number(CONFIG.revalidateTime || 0))
  const rawCategory = context.params?.category
  const rawPage = context.params?.page
  const category = String(Array.isArray(rawCategory) ? rawCategory[0] : rawCategory)
  const page = Number(Array.isArray(rawPage) ? rawPage[0] : rawPage)

  if (!Number.isFinite(page) || page < 1) {
    return { notFound: true, revalidate }
  }

  const posts = await getPosts()
  const visible = posts.filter((p) => p.status?.includes("Public"))
  const byCategory = visible.filter((p) => (p.category || "") === category)

  if (byCategory.length === 0) {
    return { notFound: true, revalidate }
  }

  // Allow any page number >=1; Feed will handle slicing/pagination.
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags || [])))

  return {
    props: {
      posts: byCategory,
      currentPage: page,
      allTags,
      category,
    },
    revalidate,
  }
}

export default CategoryPagedPage
