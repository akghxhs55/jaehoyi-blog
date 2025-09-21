import { GetServerSideProps, NextPage } from "next"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import Feed from "src/routes/Feed" // 기존 메인 페이지의 Feed 컴포넌트
import Pagination from "src/components/Pagination" // 새로 만들 컴포넌트
import { TPost } from "src/types"

type Props = {
  posts: TPost[]
  currentPage: number
  totalPages: number
  allTags: string[]
}

const PaginatedPage: NextPage<Props> = ({ posts, currentPage, totalPages, allTags }) => {
  return (
    <>
      <Feed posts={posts} allTags={allTags} />
      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const posts = await getPosts()
  const page = parseInt((context.params?.page as string) || "1")
  const currentTag = context.query.tag as string || null
  const postsPerPage = CONFIG.postsPerPage
  const filteredPosts = currentTag
    ? posts.filter((post) => post.tags?.includes(currentTag))
    : posts

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage)
  const startIndex = (page - 1) * postsPerPage
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage)

  const allTags = Array.from(
    new Set(posts.flatMap((post) => post.tags || []))
  )

  return {
    props: {
      posts: paginatedPosts,
      currentPage: page,
      totalPages,
      allTags,
    },
  }
}

export default PaginatedPage