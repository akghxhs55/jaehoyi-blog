import { GetStaticProps, NextPage } from "next"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import { filterPosts } from "src/libs/utils/notion"
import Feed from "src/routes/Feed"
import { TPost } from "src/types"
import MetaConfig from "src/components/MetaConfig"

type Props = {
  posts: TPost[]
  allTags: string[]
}

const HomePage: NextPage<Props> = ({ posts, allTags }) => {
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
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const revalidate = Math.max(60, Number(CONFIG.revalidateTime || 0))

  const posts = await getPosts()

  const visiblePosts = filterPosts(posts)

  const allTags = Array.from(new Set(visiblePosts.flatMap((post) => post.tags || [])))

  return {
    props: {
      posts: visiblePosts,
      allTags,
    },
    revalidate,
  }
}

export default HomePage
