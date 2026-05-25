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
import { getRecordMapExcerpt } from "src/libs/utils/notion/getRecordMapExcerpt"
import { pruneRecordMap } from "src/libs/utils/notion/pruneRecordMap"

const filter: FilterPostsOptions = {
  acceptStatus: ["Public", "PublicOnDetail"],
  acceptType: ["Paper", "Post", "Page"],
}

export const getStaticPaths = async () => {
  const posts = await getPosts()
  const filteredPost = filterPosts(posts, filter)

  return {
    paths: filteredPost.map((row) => `/${row.slug}`),
    fallback: 'blocking',
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
  const detailPosts = filterPosts(posts, filter)
  const postDetail = detailPosts.find((t: any) => t.slug === slug)

  if (!postDetail) {
    return {
      notFound: true,
      revalidate: CONFIG.revalidateTime,
    }
  }

  const recordMap = pruneRecordMap(await getRecordMap(postDetail.id), postDetail.id)
  const excerpt = postDetail.summary || getRecordMapExcerpt(recordMap, postDetail.id)

  await qc.prefetchQuery({
    queryKey: queryKey.post(slug),
    queryFn: async () => ({
      ...postDetail,
      excerpt,
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
  const post = usePostQuery()

  if (!post) return <CustomError />

  const image =
    post.thumbnail ||
    (CONFIG.ogImageGenerateURL
      ? `${CONFIG.ogImageGenerateURL}/${encodeURIComponent(post.title)}.png`
      : CONFIG.profile.image)

  const date = post.date?.start_date || post.createdTime || ""

  const meta = {
    title: post.title,
    date: new Date(date).toISOString(),
    image: image,
    description: post.summary || post.excerpt || CONFIG.blog.description,
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
