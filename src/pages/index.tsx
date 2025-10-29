import { GetServerSideProps, NextPage } from "next"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import Feed from "src/routes/Feed"
import Pagination from "src/components/Pagination"
import { TPost } from "src/types"
import { DEFAULT_CATEGORY } from "src/constants"
import MetaConfig from "src/components/MetaConfig"

type Props = {
  posts: TPost[]
  totalPages: number
  allTags: string[]
}

const HomePage: NextPage<Props> = ({ posts, totalPages, allTags }) => {
  const meta = {
    title: CONFIG.blog.title,
    description: CONFIG.blog.description,
    type: "Website",
    url: CONFIG.link,
  }
  return (
    <>
      <MetaConfig {...meta} />
      <Feed posts={posts} allTags={allTags} />
      <Pagination currentPage={1} totalPages={totalPages} />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Cache-Control for CDN (Vercel Edge/CDN)
  const swr = Math.max(60, Number(CONFIG.revalidateTime || 0))
  context.res.setHeader(
    "Cache-Control",
    `public, s-maxage=${swr}, stale-while-revalidate=${Math.max(60, Math.floor(swr / 2))}`
  )

  const posts = await getPosts()

  const currentTag = (context.query.tag as string) || null
  const currentSearch = (context.query.q as string) || null
  const currentCategory = (context.query.category as string) || DEFAULT_CATEGORY
  const currentOrder = (context.query.order as string) || "desc"

  let filteredPosts = posts

  filteredPosts = filteredPosts.filter((post) => post.status?.includes("Public"))

  if (currentTag) {
    filteredPosts = filteredPosts.filter((post) => post.tags?.includes(currentTag))
  }

  if (currentSearch) {
    const normalizedSearch = currentSearch.toLowerCase().replace(/\s/g, "")

    filteredPosts = filteredPosts.filter((post) => {
      const tagContent = post.tags ? post.tags.join(" ") : ""
      const searchContent = post.title + post.summary + tagContent
      const normalizedContent = searchContent.toLowerCase().replace(/\s/g, "")
      return normalizedContent.includes(normalizedSearch)
    })
  }

  if (currentCategory !== DEFAULT_CATEGORY) {
    filteredPosts = filteredPosts.filter((post) => post.category?.includes(currentCategory))
  }

  if (currentOrder !== "desc") {
    filteredPosts = [...filteredPosts].reverse()
  }

  const postsPerPage = CONFIG.postsPerPage
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage)
  const paginatedPosts = filteredPosts.slice(0, postsPerPage)

  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags || [])))

  return {
    props: {
      posts: paginatedPosts,
      totalPages,
      allTags,
    },
  }
}

export default HomePage
