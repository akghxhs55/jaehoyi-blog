import { GetStaticPaths, GetStaticProps, NextPage } from "next"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import Feed from "src/routes/Feed"
import Pagination from "src/components/Pagination"
import { TPost } from "src/types"
import MetaConfig from "src/components/MetaConfig"

type Props = {
  posts: TPost[]
  currentPage: number
  totalPages: number
  allTags: string[]
}

const PaginatedPage: NextPage<Props> = ({ posts, currentPage, totalPages, allTags }) => {
  const meta = {
    title: CONFIG.blog.title,
    description: CONFIG.blog.description,
    type: "Website",
    url: `${CONFIG.link}/page/${currentPage}`,
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
  // Pre-generate first 5 pages; rest will be generated on-demand (blocking)
  const paths = Array.from({ length: 5 }, (_, i) => ({ params: { page: String(i + 1) } }))
  return { paths, fallback: 'blocking' }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const revalidate = Math.max(60, Number(CONFIG.revalidateTime || 0))
  const raw = context.params?.page
  const page = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(page) || page < 1) {
    return { notFound: true, revalidate }
  }

  const posts = await getPosts()

  // Only public posts, default desc
  const visiblePosts = posts.filter((post) => post.status?.includes("Public"))

  const postsPerPage = CONFIG.postsPerPage
  const totalPages = Math.max(1, Math.ceil(visiblePosts.length / postsPerPage))

  if (page > totalPages) {
    return { notFound: true, revalidate }
  }

  const startIndex = (page - 1) * postsPerPage
  const paginatedPosts = visiblePosts.slice(startIndex, startIndex + postsPerPage)

  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags || [])))

  return {
    props: {
      posts: paginatedPosts,
      currentPage: page,
      totalPages,
      allTags,
    },
    revalidate,
  }
}

export default PaginatedPage