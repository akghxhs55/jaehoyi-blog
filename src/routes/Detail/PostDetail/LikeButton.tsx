import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import usePostQuery from "src/hooks/usePostQuery"
import styled from "@emotion/styled"
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai"

const LikeButton = () => {
  const qc = useQueryClient()
  const post = usePostQuery()
  const slug = post?.slug

  // Server is the source of truth for liked state; no localStorage gating for toggle

  const { data } = useQuery<{ likes: number; liked: boolean } | null>({
    queryKey: ["likes", slug],
    enabled: typeof window !== "undefined" && !!slug,
    queryFn: async () => {
      const res = await fetch(`/api/likes?slug=${slug}`, { cache: "no-store", credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch likes")
      const json = await res.json()
      return { likes: json.likes as number, liked: !!json.liked }
    },
  })

  const likes = data?.likes ?? 0
  const liked = data?.liked ?? false

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/likes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug }),
      })
      if (!res.ok) throw new Error("Failed to toggle like")
      const json = await res.json()
      return { likes: json.likes as number, liked: !!json.liked }
    },
    onMutate: async () => {
      if (!slug) return
      await qc.cancelQueries({ queryKey: ["likes", slug] })
      const prev = qc.getQueryData<{ likes: number; liked: boolean } | null>(["likes", slug])
      const prevLikes = prev?.likes ?? 0
      const prevLiked = prev?.liked ?? false
      const nextLiked = !prevLiked
      const nextLikes = Math.max(0, prevLikes + (nextLiked ? 1 : -1))
      qc.setQueryData(["likes", slug], { likes: nextLikes, liked: nextLiked })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (!slug) return
      if (ctx?.prev != null) qc.setQueryData(["likes", slug], ctx.prev)
    },
    onSuccess: (payload) => {
      // Ensure cache reflects server truth after optimistic update
      if (slug) qc.setQueryData(["likes", slug], payload)
    },
    onSettled: () => {
      if (slug) qc.invalidateQueries({ queryKey: ["likes", slug] })
    },
  })

  const disabled = !slug || mutation.isPending || mutation.isLoading

  return (
    <Wrapper>
      <button onClick={() => mutation.mutate()} disabled={disabled} aria-label={liked ? "Unlike this post" : "Like this post"} aria-pressed={liked}>
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
