import PostCard from "src/routes/Feed/PostList/PostCard"
import { TPost } from "src/types"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

type Props = {
  posts: TPost[]
  q: string
}

const PostList: React.FC<Props> = ({ posts, q }) => {
  const slugs = useMemo(() => posts.map((p) => p.slug).filter(Boolean), [posts])

  const { data: counts } = useQuery<Record<string, number>>({
    queryKey: ["likes", "batch", slugs],
    enabled: typeof window !== "undefined" && slugs.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 0,
    queryFn: async () => {
      const params = new URLSearchParams({ slugs: slugs.join(",") })
      const res = await fetch(`/api/likes?${params.toString()}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch likes counts")
      const json = await res.json()
      return (json.counts || {}) as Record<string, number>
    },
  })

  return (
    <>
      <div className="my-2">
        {!posts.length && (
          <p className="text-gray-500 dark:text-gray-300">Nothing! 😺</p>
        )}
        {posts.map((post, idx) => (
          <PostCard key={post.id} data={post} priority={idx === 0} likeCount={counts?.[post.slug]} />
        ))}
      </div>
    </>
  );
}

export default PostList
