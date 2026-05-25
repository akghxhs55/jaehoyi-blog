import { GetStaticPaths, GetStaticProps, NextPage } from "next"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import { filterPosts } from "src/libs/utils/notion"
import Feed from "src/routes/Feed"
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
  allTags: string[]
  categoryPosts: TPost[]
  tag: string
}

const TagPage: NextPage<Props> = ({ posts, currentPage, allTags, categoryPosts, tag }) => {
  const meta = {
    title: `${tag} 태그 글 | ${CONFIG.blog.title}`,
    description: `${tag} 태그로 분류된 ${CONFIG.blog.title}의 글 목록입니다.`,
    type: "Website",
    url: `${CONFIG.link}/tag/${encodeURIComponent(tag)}`,
  }
  return (
    <>
      <MetaConfig {...meta} />
      <Feed posts={posts} allTags={allTags} categoryPosts={categoryPosts} />
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPosts()
  const tags = getTopTags(filterPosts(posts), 50)
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
  const visible = filterPosts(posts)
  const byTag = visible.filter((p) => (p.tags || []).includes(tag))

  if (byTag.length === 0) {
    return { notFound: true, revalidate }
  }

  const allTags = Array.from(new Set(visible.flatMap((p) => p.tags || [])))

  return {
    props: {
      posts: byTag,
      currentPage: 1,
      allTags,
      categoryPosts: visible,
      tag,
    },
    revalidate,
  }
}

export default TagPage
