import Detail from "src/routes/Detail"
import { filterPosts } from "src/libs/utils/notion"
import { CONFIG } from "site.config"
import { NextPageWithLayout } from "../types"
import CustomError from "src/routes/Error"
import { getRecordMap, getPosts } from "src/apis"
import MetaConfig from "src/components/MetaConfig"
import { GetStaticProps } from "next"
import { QueryClient, dehydrate } from "@tanstack/react-query"
import { queryKey } from "src/constants/queryKey"
import usePostQuery from "src/hooks/usePostQuery"
import { FilterPostsOptions } from "src/libs/utils/notion/filterPosts"
import { useRouter } from "next/router"

const filter: FilterPostsOptions = {
  acceptStatus: ["Public", "PublicOnDetail"],
  acceptType: ["Paper", "Post", "Page"],
}

export const getStaticPaths = async () => {
  const posts = await getPosts()
  const filteredPost = filterPosts(posts, filter)

  return {
    paths: filteredPost.map((row) => `/${row.slug}`),
    fallback: true,
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const rawSlug = context.params?.slug
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug

  if (!slug) {
    return {
      notFound: true,
      revalidate: CONFIG.revalidateTime,
    }
  }

  const qc = new QueryClient()

  const posts = await getPosts()
  const feedPosts = filterPosts(posts)
  await qc.prefetchQuery({
    queryKey: queryKey.posts(),
    queryFn: async () => feedPosts,
  })

  const detailPosts = filterPosts(posts, filter)
  const postDetail = detailPosts.find((t: any) => t.slug === slug)

  if (!postDetail) {
    return {
      notFound: true,
      revalidate: CONFIG.revalidateTime,
    }
  }

  const recordMap = await getRecordMap(postDetail.id)

  await qc.prefetchQuery({
    queryKey: queryKey.post(slug),
    queryFn: async () => ({
      ...postDetail,
      recordMap,
    }),
  })

  return {
    props: {
      dehydratedState: dehydrate(qc),
    },
    revalidate: CONFIG.revalidateTime,
  }
}

const DetailPage: NextPageWithLayout = () => {
  const router = useRouter()
  const post = usePostQuery()

  // Handle Next.js fallback and router readiness to avoid premature 404
  if (router.isFallback || !router.isReady) {
    return null
  }

  if (!post) return <CustomError />

  const image =
    post.thumbnail ??
    CONFIG.ogImageGenerateURL ??
    `${CONFIG.ogImageGenerateURL}/${encodeURIComponent(post.title)}.png`

  const date = post.date?.start_date || post.createdTime || ""

  const meta = {
    title: post.title,
    date: new Date(date).toISOString(),
    image: image,
    description: post.summary || "",
    type: post.type[0],
    url: `${CONFIG.link}/${post.slug}`,
  }

  return (
    <>
      <MetaConfig {...meta} />
      <Detail />
    </>
  )
}

DetailPage.getLayout = (page) => {
  return <>{page}</>
}

export default DetailPage
