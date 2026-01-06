import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import usePostQuery from "src/hooks/usePostQuery"
import styled from "@emotion/styled"
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai"

const LikeButton = () => {
  const qc = useQueryClient()
  const post = usePostQuery()
  const slug = post?.slug

  // Local duplicate check: store liked state in localStorage to avoid KV membership checks
  const storageKey = typeof slug === "string" ? `liked:${slug}` : ""

  const { data } = useQuery<{ likes: number; liked: boolean } | null>({
    queryKey: ["likes", slug],
    enabled: typeof window !== "undefined" && !!slug,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 0,
    queryFn: async () => {
      const res = await fetch(`/api/likes?slug=${slug}&lite=1`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch likes")
      const json = await res.json()
      // liked from localStorage only
      const localLiked = typeof window !== "undefined" && storageKey ? !!localStorage.getItem(storageKey) : false
      return { likes: json.likes as number, liked: localLiked }
    },
  })

  const likes = data?.likes ?? 0
  const liked = data?.liked ?? false

  const mutation = useMutation({
    mutationFn: async (nextLiked: boolean) => {
      const res = await fetch(`/api/likes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, nextLiked, clientDecides: true }),
      })
      if (!res.ok) throw new Error("Failed to toggle like")
      const json = await res.json()
      return { likes: json.likes as number, liked: !!nextLiked }
    },
    onMutate: async () => {
      if (!slug) return
      await qc.cancelQueries({ queryKey: ["likes", slug] })
      const prev = qc.getQueryData<{ likes: number; liked: boolean } | null>(["likes", slug])
      const prevLikes = prev?.likes ?? 0
      const prevLiked = prev?.liked ?? false
      const nextLiked = !prevLiked
      const nextLikes = Math.max(0, prevLikes + (nextLiked ? 1 : -1))
      // persist locally to prevent duplicate likes across sessions on same browser
      if (typeof window !== "undefined" && storageKey) {
        if (nextLiked) localStorage.setItem(storageKey, "1")
        else localStorage.removeItem(storageKey)
      }
      qc.setQueryData(["likes", slug], { likes: nextLikes, liked: nextLiked })
      return { prev, nextLiked }
    },
    onError: (_err, _vars, ctx) => {
      if (!slug) return
      // revert localStorage if needed
      if (typeof window !== "undefined" && storageKey && ctx && "nextLiked" in (ctx as any)) {
        const intended = (ctx as any).nextLiked as boolean
        if (intended) localStorage.removeItem(storageKey)
        else localStorage.setItem(storageKey, "1")
      }
      if (ctx?.prev != null) qc.setQueryData(["likes", slug], ctx.prev)
    },
    onSuccess: (payload) => {
      if (slug) qc.setQueryData(["likes", slug], payload)
    },
    // Avoid an extra GET after toggling to minimize KV reads; rely on mutation payload
    // and optimistic update. If you need stronger consistency, re-enable invalidation.
    // onSettled: () => {
    //   if (slug) qc.invalidateQueries({ queryKey: ["likes", slug] })
    // },
  })

  const disabled = !slug || mutation.isPending

  return (
    <Wrapper>
      <button
        onClick={() => mutation.mutate(!liked)}
        disabled={disabled}
        aria-label={liked ? "Unlike this post" : "Like this post"}
        aria-pressed={liked}
      >
        {liked ? <AiFillHeart size={18} color="#e11d48" /> : <AiOutlineHeart size={18} />} {likes}
      </button>
    </Wrapper>
  )
}

export default LikeButton

const Wrapper = styled.div`
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.gray6};
    background: ${({ theme }) => (theme.scheme === "light" ? "white" : theme.colors.gray4)};
    color: ${({ theme }) => theme.colors.gray12};
    cursor: pointer;
  }
  button svg {
    vertical-align: middle;
    transform: translateY(-1px);
  }
  button[disabled] {
    opacity: 0.85;
    cursor: default;
    border-color: ${({ theme }) => theme.colors.gray7};
  }
`
