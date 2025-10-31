import { GetStaticProps, NextPage } from "next"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import Feed from "src/routes/Feed"
import Pagination from "src/components/Pagination"
import { TPost } from "src/types"
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

export const getStaticProps: GetStaticProps = async () => {
  const revalidate = Math.max(60, Number(CONFIG.revalidateTime || 0))

  const posts = await getPosts()

  // Only public posts, default order desc (getPosts already sorted desc)
  const visiblePosts = posts.filter((post) => post.status?.includes("Public"))

  const postsPerPage = CONFIG.postsPerPage
  const totalPages = Math.max(1, Math.ceil(visiblePosts.length / postsPerPage))
  const paginatedPosts = visiblePosts.slice(0, postsPerPage)

  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags || [])))

  return {
    props: {
      posts: paginatedPosts,
      totalPages,
      allTags,
    },
    revalidate,
  }
}

export default HomePage
